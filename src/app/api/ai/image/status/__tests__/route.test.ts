import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => {
  process.env.REPLICATE_MODEL_FAST = "nano-banana-2";
  process.env.REPLICATE_MODEL_PRO = "nano-banana-pro";
  process.env.REPLICATE_MODEL_FALLBACK = "nano-banana";
  process.env.REPLICATE_MODEL_ADVANCED = "gpt-image-2";
});
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { IMAGE_MODEL_COST } from "@/lib/plan-limits";
import { checkRateLimit, redis } from "@/lib/rate-limiter";
import {
  checkImagePrediction,
  downloadImage,
  getDimensionsFromAspectRatio,
  startImageGeneration,
} from "@/lib/services/ai-image";
import { releaseImageQuota, tryConsumeImageQuota } from "@/lib/services/ai-image-quota-atomic";
import { upload } from "@/lib/storage";
import { GET } from "../route";

// ── Mocks ────────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));

vi.mock("@/lib/db", () => ({
  db: { insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })) },
}));

vi.mock("@/lib/cache", () => ({ cache: { delete: vi.fn().mockResolvedValue(undefined) } }));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  createRateLimitResponse: vi.fn(() => new Response(null, { status: 429 })),
  redis: { get: vi.fn(), del: vi.fn(), setex: vi.fn().mockResolvedValue("OK") },
}));

vi.mock("@/lib/middleware/require-plan", () => ({
  getUserPlanType: vi.fn().mockResolvedValue("pro_monthly"),
}));

vi.mock("@/lib/services/ai-image", () => ({
  checkImagePrediction: vi.fn(),
  startImageGeneration: vi.fn(),
  downloadImage: vi.fn(),
  getDimensionsFromAspectRatio: vi.fn(() => ({ width: 1024, height: 1024 })),
}));

vi.mock("@/lib/services/ai-image-quota-atomic", () => ({
  releaseImageQuota: vi.fn().mockResolvedValue(undefined),
  tryConsumeImageQuota: vi
    .fn()
    .mockResolvedValue({ allowed: true, used: 1, limit: 50, resetAt: new Date() }),
}));

vi.mock("@/lib/storage", () => ({ upload: vi.fn() }));

// ── Helpers ──────────────────────────────────────────────────────────────
const PRED_ID = "pred-1";

function makeReq(id = PRED_ID) {
  return new NextRequest(`http://localhost/api/ai/image/status?id=${id}`, {
    headers: { "x-correlation-id": "corr-1" },
  });
}

interface MetaOverrides {
  userId?: string;
  model?: string;
  consumedWeight?: number | undefined;
  firstPolledAt?: number;
  style?: string | null;
}

function metaJson(overrides: MetaOverrides = {}): string {
  const base = {
    userId: "user-1",
    model: "gpt-image-2",
    finalPrompt: "a cat in space",
    aspectRatio: "1:1",
    style: null,
    consumedWeight: 5,
  };
  // JSON.stringify drops keys whose value is undefined — used to simulate the
  // legacy (pre-atomic) prediction that has no consumedWeight.
  return JSON.stringify({ ...base, ...overrides });
}

/** Simulates the atomic DEL race: the first poll wins (1), every later poll loses (0). */
function delRace() {
  vi.mocked(redis.del).mockResolvedValueOnce(1).mockResolvedValue(0);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: "user-1" } } as never);
  vi.mocked(checkRateLimit).mockResolvedValue({ success: true } as never);
  vi.mocked(redis.setex).mockResolvedValue("OK");
});

describe("GET /api/ai/image/status — terminal-path idempotency", () => {
  it("two concurrent terminal-failure polls release quota exactly once", async () => {
    vi.mocked(redis.get).mockResolvedValue(metaJson({ model: "gpt-image-2", consumedWeight: 5 }));
    vi.mocked(checkImagePrediction).mockResolvedValue({ status: "failed", error: "boom" } as never);
    delRace();

    await Promise.all([GET(makeReq()), GET(makeReq())]);

    expect(releaseImageQuota).toHaveBeenCalledTimes(1);
    expect(releaseImageQuota).toHaveBeenCalledWith("user-1", 5);
    expect(startImageGeneration).not.toHaveBeenCalled();
  });

  it("two concurrent failure polls release quota exactly once", async () => {
    vi.mocked(redis.get).mockResolvedValue(metaJson({ model: "gpt-image-2", consumedWeight: 5 }));
    vi.mocked(checkImagePrediction).mockResolvedValue({
      status: "failed",
      error: "model exploded",
    } as never);
    delRace();

    const [r1, r2] = await Promise.all([GET(makeReq()), GET(makeReq())]);
    const bodies = (await Promise.all([r1.json(), r2.json()])) as Array<{ error: string }>;

    expect(releaseImageQuota).toHaveBeenCalledTimes(1);
    expect(releaseImageQuota).toHaveBeenCalledWith("user-1", 5);
    expect(bodies[0]!.error).toBeDefined();
  });

  it("terminal failure releases full consumed quota weight", async () => {
    vi.mocked(redis.get).mockResolvedValue(metaJson({ model: "gpt-image-2", consumedWeight: 5 }));
    vi.mocked(checkImagePrediction).mockResolvedValue({
      status: "failed",
      error: "model exploded",
    } as never);
    vi.mocked(redis.del).mockResolvedValue(1);

    const res = await GET(makeReq());
    const body = (await res.json()) as { error: string };

    // Full weight release on terminal failure — no fallback.
    expect(releaseImageQuota).toHaveBeenCalledTimes(1);
    expect(releaseImageQuota).toHaveBeenCalledWith("user-1", 5);

    expect(body.error).toBeDefined();
  });

  it("two concurrent poll-timeouts release quota exactly once", async () => {
    vi.mocked(redis.get).mockResolvedValue(
      metaJson({ model: "gpt-image-2", consumedWeight: 3, firstPolledAt: Date.now() - 100_000 })
    );
    vi.mocked(checkImagePrediction).mockResolvedValue({ status: "processing" } as never);
    delRace();

    await Promise.all([GET(makeReq()), GET(makeReq())]);

    expect(releaseImageQuota).toHaveBeenCalledTimes(1);
    expect(releaseImageQuota).toHaveBeenCalledWith("user-1", 3);
  });

  it("two concurrent no-output polls release quota exactly once", async () => {
    vi.mocked(redis.get).mockResolvedValue(metaJson({ model: "gpt-image-2", consumedWeight: 3 }));
    vi.mocked(checkImagePrediction).mockResolvedValue({
      status: "succeeded",
      output: null,
    } as never);
    delRace();

    await Promise.all([GET(makeReq()), GET(makeReq())]);

    expect(releaseImageQuota).toHaveBeenCalledTimes(1);
    expect(releaseImageQuota).toHaveBeenCalledWith("user-1", 3);
  });
});

describe("GET /api/ai/image/status — success path", () => {
  beforeEach(() => {
    vi.mocked(checkImagePrediction).mockResolvedValue({
      status: "succeeded",
      output: "https://replicate/img.png",
    } as never);
    vi.mocked(downloadImage).mockResolvedValue(Buffer.from("img") as never);
    vi.mocked(upload).mockResolvedValue({ url: "https://stored/img.png" } as never);
    vi.mocked(getDimensionsFromAspectRatio).mockReturnValue({ width: 1024, height: 1024 } as never);
    vi.mocked(redis.del).mockResolvedValue(1);
  });

  it("records usage once and does NOT re-consume for a modern prediction", async () => {
    vi.mocked(redis.get).mockResolvedValue(metaJson({ model: "gpt-image-2", consumedWeight: 5 }));

    const res = await GET(makeReq());
    const body = (await res.json()) as { status: string; imageUrl: string };

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(tryConsumeImageQuota).not.toHaveBeenCalled();
    expect(releaseImageQuota).not.toHaveBeenCalled();
    expect(body.status).toBe("succeeded");
    expect(body.imageUrl).toBe("https://stored/img.png");
  });

  it("best-effort consumes once for a legacy prediction (no consumedWeight)", async () => {
    vi.mocked(redis.get).mockResolvedValue(
      metaJson({ model: "gpt-image-2", consumedWeight: undefined })
    );

    await GET(makeReq());

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(tryConsumeImageQuota).toHaveBeenCalledTimes(1);
    expect(tryConsumeImageQuota).toHaveBeenCalledWith("user-1", IMAGE_MODEL_COST["gpt-image-2"]);
  });
});
