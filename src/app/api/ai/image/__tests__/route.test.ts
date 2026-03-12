
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
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
      feedbackVotes: {
        findFirst: vi.fn(),
      },
      xAccounts: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    insert: vi.fn(),
    values: vi.fn().mockResolvedValue(true),
    delete: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
  };

  dbMock.select.mockImplementation(() => dbMock);
  dbMock.from.mockImplementation(() => dbMock);
  dbMock.where.mockImplementation(() => dbMock);
  dbMock.insert.mockImplementation(() => dbMock);
  dbMock.delete.mockImplementation(() => dbMock);
  dbMock.update.mockImplementation(() => dbMock);
  dbMock.set.mockImplementation(() => dbMock);

  return { db: dbMock };
});

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/services/ai-image", () => ({
  generateImage: vi.fn(),
  downloadImage: vi.fn(),
  validateModelForPlan: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  upload: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({ text: "generated prompt" }),
}));

vi.mock("@openrouter/ai-sdk-provider", () => ({
  openrouter: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limiter";
import { generateImage, downloadImage, validateModelForPlan } from "@/lib/services/ai-image";
import { upload } from "@/lib/storage";

describe("AI Image API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    (auth.api.getSession as any).mockResolvedValue({ user: { id: "user-1" } });
    (db.query.user.findFirst as any).mockResolvedValue({ plan: "pro_monthly" });
    (validateModelForPlan as any).mockReturnValue({ valid: true });
    (checkRateLimit as any).mockResolvedValue({ success: true });
    // @ts-ignore
    (db.where as any).mockReturnValue([{ count: 0 }]); // Quota check
    (generateImage as any).mockResolvedValue({
      imageUrl: "data:image/png;base64,test",
      width: 1024,
      height: 1024,
      model: "nano-banana-2",
      prompt: "test prompt",
    });
    (downloadImage as any).mockResolvedValue(Buffer.from("test"));
    (upload as any).mockResolvedValue({ url: "https://storage.com/image.png" });
  });

  it("should generate image successfully", async () => {
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
    expect(data.imageUrl).toBe("https://storage.com/image.png");
    expect(generateImage).toHaveBeenCalled();
    expect(upload).toHaveBeenCalled();
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

  it("should return 403 if quota exceeded", async () => {
    // @ts-ignore
    (db.where as any).mockReturnValue([{ count: 100 }]); // Over limit

    const req = new NextRequest("http://localhost/api/ai/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
