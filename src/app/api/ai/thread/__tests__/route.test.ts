import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { db } from "@/lib/db";
import { canPostLongContent } from "@/lib/services/x-subscription";
import { POST } from "../route";

vi.mock("@/lib/api/ai-preamble", () => ({
  aiPreamble: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const mockQuery = {
    xAccounts: {
      findFirst: vi.fn(),
    },
  };

  return {
    db: {
      query: mockQuery,
    },
  };
});

vi.mock("@/lib/services/x-subscription", () => ({
  canPostLongContent: vi.fn(),
  getMaxCharacterLimit: vi.fn(() => 280),
  getTierLabel: vi.fn(() => "Free X account"),
}));

vi.mock("@/lib/services/ai-quota", () => ({
  recordAiUsage: vi.fn(),
}));

vi.mock("@/lib/services/x-api", () => ({
  XApiService: {
    fetchXSubscriptionTier: vi.fn(),
  },
}));

vi.mock("ai", () => ({
  streamText: vi.fn().mockResolvedValue({
    textStream: (async function* () {
      yield "Test tweet content";
    })(),
    usage: Promise.resolve({ totalTokens: 10 }),
  }),
}));

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn(() => ({
    __proto__: Function.prototype,
    call: vi.fn(),
    apply: vi.fn(),
    bind: vi.fn(),
    toString: vi.fn(() => "mock"),
  })),
}));

describe("AI Thread API — Tier Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (aiPreamble as any).mockResolvedValue({
      session: { user: { id: "user-1", email: "test@example.com" } },
      dbUser: { plan: "free", voiceProfile: null },
      model: {},
    });
    (db.query.xAccounts.findFirst as any).mockResolvedValue(null);
    (canPostLongContent as any).mockReturnValue(false);
  });

  describe("single mode with short option", () => {
    it("should allow short option for Free tier users", async () => {
      const req = new NextRequest("http://localhost/api/ai/thread", {
        method: "POST",
        body: JSON.stringify({
          topic: "Test topic",
          mode: "single",
          lengthOption: "short",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // Zod v4 requires RFC-4122-compliant UUIDs: version [1-8] in position 3,
  // variant [89ab] in position 4. Simple all-zero IDs fail the validator.
  const ACCOUNT_ID_FREE = "550e8400-e29b-41d4-a716-446655440001";
  const ACCOUNT_ID_PREMIUM = "550e8400-e29b-41d4-a716-446655440002";
  const ACCOUNT_ID_MISSING = "550e8400-e29b-41d4-a716-446655440099";

  describe("single mode with medium/long option", () => {
    it("should return 403 for medium option without targetAccountId", async () => {
      const req = new NextRequest("http://localhost/api/ai/thread", {
        method: "POST",
        body: JSON.stringify({
          topic: "Test topic",
          mode: "single",
          lengthOption: "medium",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("should return 403 for long option with Free tier account", async () => {
      (db.query.xAccounts.findFirst as any).mockResolvedValue({
        id: ACCOUNT_ID_FREE,
        xUsername: "testuser",
        xSubscriptionTier: "None",
        xSubscriptionTierUpdatedAt: new Date(),
      });
      (canPostLongContent as any).mockReturnValue(false);

      const req = new NextRequest("http://localhost/api/ai/thread", {
        method: "POST",
        body: JSON.stringify({
          topic: "Test topic",
          mode: "single",
          lengthOption: "long",
          targetAccountId: ACCOUNT_ID_FREE,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.error).toContain("Premium subscription");
    });

    it("should allow medium option for Premium tier account", async () => {
      (db.query.xAccounts.findFirst as any).mockResolvedValue({
        id: ACCOUNT_ID_PREMIUM,
        xUsername: "testuser",
        xSubscriptionTier: "Premium",
        xSubscriptionTierUpdatedAt: new Date(),
      });
      (canPostLongContent as any).mockReturnValue(true);

      const req = new NextRequest("http://localhost/api/ai/thread", {
        method: "POST",
        body: JSON.stringify({
          topic: "Test topic",
          mode: "single",
          lengthOption: "medium",
          targetAccountId: ACCOUNT_ID_PREMIUM,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("should allow long option for Premium tier account", async () => {
      (db.query.xAccounts.findFirst as any).mockResolvedValue({
        id: ACCOUNT_ID_PREMIUM,
        xUsername: "testuser",
        xSubscriptionTier: "Premium",
        xSubscriptionTierUpdatedAt: new Date(),
      });
      (canPostLongContent as any).mockReturnValue(true);

      const req = new NextRequest("http://localhost/api/ai/thread", {
        method: "POST",
        body: JSON.stringify({
          topic: "Test topic",
          mode: "single",
          lengthOption: "long",
          targetAccountId: ACCOUNT_ID_PREMIUM,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("should return 404 for non-existent account", async () => {
      (db.query.xAccounts.findFirst as any).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/ai/thread", {
        method: "POST",
        body: JSON.stringify({
          topic: "Test topic",
          mode: "single",
          lengthOption: "medium",
          targetAccountId: ACCOUNT_ID_MISSING,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(404);
    });

    it("should trigger tier re-fetch when cached data is stale (>24h)", async () => {
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago
      (db.query.xAccounts.findFirst as any).mockResolvedValue({
        id: ACCOUNT_ID_FREE,
        xUsername: "testuser",
        xSubscriptionTier: "None",
        xSubscriptionTierUpdatedAt: staleDate,
      });
      const { XApiService } = await import("@/lib/services/x-api");
      (XApiService.fetchXSubscriptionTier as any).mockResolvedValue("None");
      (canPostLongContent as any).mockReturnValue(false);

      const req = new NextRequest("http://localhost/api/ai/thread", {
        method: "POST",
        body: JSON.stringify({
          topic: "Test topic",
          mode: "single",
          lengthOption: "long",
          targetAccountId: ACCOUNT_ID_FREE,
        }),
      });

      const res = await POST(req);
      expect(XApiService.fetchXSubscriptionTier).toHaveBeenCalledWith(ACCOUNT_ID_FREE);
      expect(res.status).toBe(403);
    });

    it("should not re-fetch tier when cached data is fresh (<24h)", async () => {
      const freshDate = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
      (db.query.xAccounts.findFirst as any).mockResolvedValue({
        id: ACCOUNT_ID_FREE,
        xUsername: "testuser",
        xSubscriptionTier: "None",
        xSubscriptionTierUpdatedAt: freshDate,
      });
      const { XApiService } = await import("@/lib/services/x-api");
      (canPostLongContent as any).mockReturnValue(false);

      const req = new NextRequest("http://localhost/api/ai/thread", {
        method: "POST",
        body: JSON.stringify({
          topic: "Test topic",
          mode: "single",
          lengthOption: "long",
          targetAccountId: ACCOUNT_ID_FREE,
        }),
      });

      await POST(req);
      expect(XApiService.fetchXSubscriptionTier).not.toHaveBeenCalled();
    });
  });

  describe("thread mode", () => {
    it("should not validate tier for thread mode", async () => {
      const req = new NextRequest("http://localhost/api/ai/thread", {
        method: "POST",
        body: JSON.stringify({
          topic: "Test topic",
          mode: "thread",
          tweetCount: 5,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(db.query.xAccounts.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("unauthorized access", () => {
    it("should return 401 if not authenticated", async () => {
      (aiPreamble as any).mockResolvedValue(new Response("Unauthorized", { status: 401 }));

      const req = new NextRequest("http://localhost/api/ai/thread", {
        method: "POST",
        body: JSON.stringify({ topic: "Test" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });
});
