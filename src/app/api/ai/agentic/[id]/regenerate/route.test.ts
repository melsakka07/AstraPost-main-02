/**
 * Unit tests for POST /api/ai/agentic/[id]/regenerate — image quota release.
 *
 * Locks the billing-correctness behavior around the optional image regen:
 *   • pollImage yields no output (timeout / failed / canceled) → quota refunded
 *   • pollImage yields an image → quota kept, image usage recorded
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// ─── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockAiPreamble,
  mockReleaseQuota,
  mockFindFirst,
  mockUpdate,
  mockGenerateText,
  mockStartImageGeneration,
  mockCheckImagePrediction,
  mockTryConsumeImageQuota,
  mockReleaseImageQuota,
  mockRecordAiUsage,
} = vi.hoisted(() => ({
  mockAiPreamble: vi.fn(),
  mockReleaseQuota: vi.fn().mockResolvedValue(undefined),
  mockFindFirst: vi.fn(),
  mockUpdate: vi.fn(() => ({
    set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  })),
  mockGenerateText: vi.fn(),
  mockStartImageGeneration: vi.fn(),
  mockCheckImagePrediction: vi.fn(),
  mockTryConsumeImageQuota: vi.fn(),
  mockReleaseImageQuota: vi.fn().mockResolvedValue(undefined),
  mockRecordAiUsage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("ai", () => ({ generateText: mockGenerateText }));

vi.mock("@/lib/correlation", () => ({ getCorrelationId: vi.fn(() => "corr-1") }));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api/ai-preamble", () => ({ aiPreamble: mockAiPreamble }));

vi.mock("@/lib/middleware/require-plan", () => ({
  checkAgenticPostingAccessDetailed: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: { agenticPosts: { findFirst: mockFindFirst } },
    update: mockUpdate,
  },
}));

vi.mock("@/lib/services/ai-image", () => ({
  startImageGeneration: mockStartImageGeneration,
  checkImagePrediction: mockCheckImagePrediction,
}));

vi.mock("@/lib/services/ai-image-quota-atomic", () => ({
  tryConsumeImageQuota: mockTryConsumeImageQuota,
  releaseImageQuota: mockReleaseImageQuota,
}));

vi.mock("@/lib/services/ai-quota", () => ({
  recordAiUsage: mockRecordAiUsage,
  estimateCost: vi.fn(() => 0),
}));

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const READY_POST_WITH_IMAGE = {
  id: "agentic-1",
  userId: "user-1",
  status: "ready",
  tweets: [
    {
      position: 0,
      text: "Original tweet",
      hashtags: ["AI"],
      hasImage: true,
      imagePrompt: "a robot writing",
      charCount: 14,
    },
  ],
  researchBrief: {},
  contentPlan: { structure: "hook" },
  user: { language: "en" },
};

// generateText returns a tweet that still requests an image, so the image branch runs.
const GENERATED_JSON = JSON.stringify({
  text: "Improved tweet",
  hashtags: ["AI"],
  hasImage: true,
  imagePrompt: "a robot writing, cinematic",
  charCount: 14,
});

function makeRequest(body: object) {
  return new Request("http://localhost/api/ai/agentic/agentic-1/regenerate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PARAMS = { params: Promise.resolve({ id: "agentic-1" }) };

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/ai/agentic/[id]/regenerate — image quota release", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_MODEL = "test/model";
    process.env.REPLICATE_MODEL_FAST = "nano-banana";

    mockAiPreamble.mockResolvedValue({
      session: { user: { id: "user-1" } },
      model: {},
      releaseQuota: mockReleaseQuota,
    });
    mockFindFirst.mockResolvedValue(READY_POST_WITH_IMAGE);
    mockGenerateText.mockResolvedValue({
      text: GENERATED_JSON,
      usage: { inputTokens: 10, outputTokens: 20 },
    });
    mockTryConsumeImageQuota.mockResolvedValue({ allowed: true });
    mockStartImageGeneration.mockResolvedValue({ predictionId: "pred-1" });
  });

  it("refunds image quota when the poll yields no output (failed prediction)", async () => {
    // pollImage() sees a terminal failure and returns null without throwing.
    mockCheckImagePrediction.mockResolvedValue({ status: "failed" });

    const res = await POST(makeRequest({ tweetIndex: 0, regenerateImage: true }), PARAMS);

    expect(res.status).toBe(200);
    expect(mockTryConsumeImageQuota).toHaveBeenCalledTimes(1);
    // The consumed quota must be released exactly once on the no-output path.
    expect(mockReleaseImageQuota).toHaveBeenCalledTimes(1);
    expect(mockReleaseImageQuota).toHaveBeenCalledWith("user-1", expect.any(Number));
    // No image was produced → no image-usage billing record.
    const imageUsageCalls = mockRecordAiUsage.mock.calls.filter(
      ([arg]) => (arg as { type?: string })?.type === "image"
    );
    expect(imageUsageCalls).toHaveLength(0);
  }, 10_000);

  it("keeps image quota and records usage when the poll yields an image", async () => {
    mockCheckImagePrediction.mockResolvedValue({
      status: "succeeded",
      output: ["https://img.example/out.png"],
    });

    const res = await POST(makeRequest({ tweetIndex: 0, regenerateImage: true }), PARAMS);

    expect(res.status).toBe(200);
    expect(mockTryConsumeImageQuota).toHaveBeenCalledTimes(1);
    // Success path must NOT release the quota.
    expect(mockReleaseImageQuota).not.toHaveBeenCalled();
    const imageUsageCalls = mockRecordAiUsage.mock.calls.filter(
      ([arg]) => (arg as { type?: string })?.type === "image"
    );
    expect(imageUsageCalls).toHaveLength(1);
  }, 10_000);
});
