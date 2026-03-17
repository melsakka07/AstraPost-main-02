import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    // @ts-ignore
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
    expect(redis.setex).toHaveBeenCalledWith(
      "ai:img:pred:pred-abc123",
      1800,
      expect.any(String),
    );
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
      body: JSON.stringify({ prompt: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("should return 403 if monthly image quota exceeded", async () => {
    // @ts-ignore
    (db.where as any).mockReturnValue([{ count: 100 }]); // Over limit

    const req = new NextRequest("http://localhost/api/ai/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should not call startImageGeneration when quota exceeded", async () => {
    // @ts-ignore
    (db.where as any).mockReturnValue([{ count: 100 }]);

    const req = new NextRequest("http://localhost/api/ai/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "test" }),
    });

    await POST(req);
    expect(startImageGeneration).not.toHaveBeenCalled();
  });
});
