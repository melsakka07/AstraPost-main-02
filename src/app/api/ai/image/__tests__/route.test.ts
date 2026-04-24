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
import { checkRateLimit, redis } from "@/lib/rate-limiter";
import { startImageGeneration, validateModelForPlan } from "@/lib/services/ai-image";
import { POST } from "../route";

// Mocks
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => {
  const dbMock: any = {
    query: {
      user: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    insert: vi.fn(),
    values: vi.fn().mockResolvedValue(true),
  };

  dbMock.select.mockImplementation(() => dbMock);
  dbMock.from.mockImplementation(() => dbMock);
  dbMock.where.mockImplementation(() => dbMock);
  dbMock.insert.mockImplementation(() => dbMock);

  return { db: dbMock };
});

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  createRateLimitResponse: vi.fn(() => new Response(null, { status: 429 })),
  redis: {
    setex: vi.fn().mockResolvedValue("OK"),
    get: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("@/lib/services/ai-image", () => ({
  startImageGeneration: vi.fn(),
  validateModelForPlan: vi.fn(),
}));

vi.mock("@/lib/middleware/require-plan", () => ({
  checkAiImageQuotaDetailed: vi.fn().mockResolvedValue({ allowed: true }),
  checkImageModelAccessDetailed: vi.fn().mockResolvedValue({ allowed: true }),
  createPlanLimitResponse: vi.fn(
    // eslint-disable-next-line no-restricted-syntax
    () => new Response(JSON.stringify({ error: "Plan limit" }), { status: 402 })
  ),
  getUserPlanType: vi.fn().mockResolvedValue("pro_monthly"),
}));

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({ text: "generated prompt" }),
}));

vi.mock("@openrouter/ai-sdk-provider", () => ({
  openrouter: vi.fn(),
}));

describe("AI Image API (POST)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default happy-path mocks
    (auth.api.getSession as any).mockResolvedValue({ user: { id: "user-1" } });
    (db.query.user.findFirst as any).mockResolvedValue({ plan: "pro_monthly" });
    (validateModelForPlan as any).mockReturnValue({ valid: true });
    (checkRateLimit as any).mockResolvedValue({ success: true });
    // @ts-expect-error
    (db.where as any).mockReturnValue([{ count: 0 }]); // Quota check
    (startImageGeneration as any).mockResolvedValue({
      predictionId: "pred-abc123",
      status: "starting",
    });
    (redis.setex as any).mockResolvedValue("OK");
  });

  it("should start image generation and return predictionId", async () => {
    const req = new NextRequest("http://localhost/api/ai/image", {
      method: "POST",
      body: JSON.stringify({
        prompt: "test prompt",
        model: "nano-banana-2",
        aspectRatio: "1:1",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.predictionId).toBe("pred-abc123");
    expect(data.estimatedSeconds).toBe(20);
    expect(startImageGeneration).toHaveBeenCalled();
    expect(redis.setex).toHaveBeenCalledWith("ai:img:pred:pred-abc123", 1800, expect.any(String));
  });

  it("should return 401 if unauthorized", async () => {
    (auth.api.getSession as any).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/ai/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 429 if rate limited", async () => {
    (checkRateLimit as any).mockResolvedValue({ success: false });

    const req = new NextRequest("http://localhost/api/ai/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "test", model: "nano-banana-2", aspectRatio: "1:1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("should return 402 if monthly image quota exceeded", async () => {
    const { checkAiImageQuotaDetailed } = await import("@/lib/middleware/require-plan");
    (checkAiImageQuotaDetailed as any).mockResolvedValueOnce({
      allowed: false,
      reason: "Quota exceeded",
    });

    const req = new NextRequest("http://localhost/api/ai/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "test", model: "nano-banana-2", aspectRatio: "1:1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(402);
  });

  it("should not call startImageGeneration when quota exceeded", async () => {
    const { checkAiImageQuotaDetailed } = await import("@/lib/middleware/require-plan");
    (checkAiImageQuotaDetailed as any).mockResolvedValueOnce({
      allowed: false,
      reason: "Quota exceeded",
    });

    const req = new NextRequest("http://localhost/api/ai/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "test", model: "nano-banana-2", aspectRatio: "1:1" }),
    });

    await POST(req);
    expect(startImageGeneration).not.toHaveBeenCalled();
  });
});
