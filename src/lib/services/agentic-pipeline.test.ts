import { generateText, streamText } from "ai";
import { Mock, beforeEach, describe, expect, it, vi } from "vitest";
import { buildWritingPrompt } from "@/lib/ai/agentic-prompts";
import type { PipelineProgressEvent } from "@/lib/ai/agentic-types";
import { runAgenticPipeline } from "@/lib/services/agentic-pipeline";
import { generateAgenticImage } from "@/lib/services/ai-image";
import { canPostLongContent } from "@/lib/services/x-subscription";

vi.mock("ai", () => ({ generateText: vi.fn(), streamText: vi.fn() }));
vi.mock("@openrouter/ai-sdk-provider", () => ({ openrouter: vi.fn(() => ({})) }));
vi.mock("@/lib/services/ai-image", () => ({ generateAgenticImage: vi.fn() }));
vi.mock("@/lib/services/ai-quota", () => ({ recordAiUsage: vi.fn() }));
vi.mock("@/lib/ai/agentic-prompts", () => ({
  buildResearchPrompt: vi.fn(() => "research prompt"),
  buildStrategyPrompt: vi.fn(() => "strategy prompt"),
  buildWritingPrompt: vi.fn(() => "writing prompt"),
  buildReviewPrompt: vi.fn(() => "review prompt"),
}));
vi.mock("@/lib/ai/voice-profile", () => ({ buildVoiceInstructions: vi.fn(() => null) }));
vi.mock("@/lib/services/x-subscription", () => ({
  canPostLongContent: vi.fn(() => false),
  getMaxCharacterLimit: vi.fn(() => 280),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockGenerateText = vi.mocked(generateText);
const mockStreamText = streamText as unknown as Mock<() => { text: Promise<string> }>;
const mockGenerateAgenticImage = vi.mocked(generateAgenticImage);
const mockBuildWritingPrompt = vi.mocked(buildWritingPrompt);
const mockCanPostLongContent = vi.mocked(canPostLongContent);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const RESEARCH_JSON = JSON.stringify({
  topic: "AI coding tools",
  angles: [{ title: "AI Replaces IDEs", description: "desc", viralPotential: "high" }],
  trendingHashtags: ["AITools", "Coding"],
  keyFacts: ["Fact 1"],
  recommendedAngle: "AI Replaces IDEs",
});

const STRATEGY_JSON = JSON.stringify({
  format: "thread",
  lengthOption: "short",
  tweetCount: 3,
  tone: "professional",
  structure: "hook → value → CTA",
  imageSlots: [0],
  rationale: "Thread for depth",
});

const TWEETS_JSON = JSON.stringify([
  {
    position: 0,
    text: "Hook tweet",
    hashtags: ["AITools"],
    hasImage: true,
    imagePrompt: "laptop with code",
    charCount: 50,
  },
  { position: 1, text: "Value tweet", hashtags: [], hasImage: false, charCount: 30 },
  { position: 2, text: "CTA tweet", hashtags: ["AI"], hasImage: false, charCount: 25 },
]);

const REVIEW_JSON = JSON.stringify({
  qualityScore: 8,
  summary: "A thread about AI coding tools",
  issues: [],
  passed: true,
});

function makeBaseParams(onProgress = vi.fn()) {
  return {
    topic: "AI coding tools replacing traditional IDEs",
    xAccountId: "acc-1",
    xSubscriptionTier: "None" as const,
    voiceProfile: null,
    voiceVariant: "default",
    language: "en",
    userId: "user-1",
    correlationId: "corr-1",
    agenticPostId: "agentic-1",
    preferences: { includeImages: true },
    onProgress,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("runAgenticPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: canPostLongContent returns false (free tier)
    mockCanPostLongContent.mockReturnValue(false);
  });

  // ── Test 1: Happy path ────────────────────────────────────────────────────
  it("happy path: returns AgenticPost with correct shape and image URL", async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: RESEARCH_JSON } as Awaited<ReturnType<typeof generateText>>)
      .mockResolvedValueOnce({ text: STRATEGY_JSON } as Awaited<ReturnType<typeof generateText>>);

    mockStreamText
      .mockReturnValueOnce({ text: Promise.resolve(TWEETS_JSON) })
      .mockReturnValueOnce({ text: Promise.resolve(REVIEW_JSON) });

    mockGenerateAgenticImage.mockResolvedValue({ url: "https://stored.example.com/img.png" });

    const onProgress = vi.fn();
    const params = makeBaseParams(onProgress);

    const result = await runAgenticPipeline(params);

    // id matches agenticPostId
    expect(result.id).toBe("agentic-1");

    // 3 tweets returned
    expect(result.tweets).toHaveLength(3);

    // Tweet at position 0 has the image URL
    const tweet0 = result.tweets.find((t) => t.position === 0);
    expect(tweet0?.imageUrl).toBe("https://stored.example.com/img.png");

    // Quality score from review
    expect(result.qualityScore).toBe(8);

    // onProgress called with review complete (pipeline does NOT emit "done" — the route handler does)
    const progressCalls = onProgress.mock.calls.map((c) => c[0] as PipelineProgressEvent);
    expect(progressCalls.some((e) => e.step === "review" && e.status === "complete")).toBe(true);

    // generateText called for research + strategy; streamText called for writing + review
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
    expect(mockStreamText).toHaveBeenCalledTimes(2);
  });

  // ── Test 2: Too-broad topic ───────────────────────────────────────────────
  it("rejects with TOPIC_TOO_BROAD and emits needs_input when research flags too_broad", async () => {
    const tooBroadJson = JSON.stringify({
      topic: "technology",
      angles: [],
      trendingHashtags: [],
      keyFacts: [],
      recommendedAngle: "",
      too_broad: true,
      broadSuggestions: ["AI in healthcare", "Blockchain for finance", "Web3 gaming"],
    });

    mockGenerateText.mockResolvedValueOnce({ text: tooBroadJson } as Awaited<
      ReturnType<typeof generateText>
    >);

    const onProgress = vi.fn();
    const params = makeBaseParams(onProgress);

    await expect(runAgenticPipeline(params)).rejects.toThrow("TOPIC_TOO_BROAD");

    // onProgress emitted needs_input for research step with suggestions
    const progressCalls = onProgress.mock.calls.map((c) => c[0] as PipelineProgressEvent);
    const needsInputEvent = progressCalls.find(
      (e) => e.step === "research" && e.status === "needs_input"
    );
    expect(needsInputEvent).toBeDefined();
    const data = needsInputEvent!.data as { suggestions: string[] };
    expect(data.suggestions).toEqual(["AI in healthcare", "Blockchain for finance", "Web3 gaming"]);

    // Pipeline stopped: generateText called only once
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  // ── Test 3: Image generation partial failure ──────────────────────────────
  it("completes pipeline even when one image generation fails", async () => {
    const strategyAllImages = JSON.stringify({
      format: "thread",
      lengthOption: "short",
      tweetCount: 3,
      tone: "professional",
      structure: "hook → value → CTA",
      imageSlots: [0, 1, 2],
      rationale: "All images",
    });

    const tweetsAllImages = JSON.stringify([
      {
        position: 0,
        text: "Hook tweet",
        hashtags: [],
        hasImage: true,
        imagePrompt: "image prompt 0",
        charCount: 50,
      },
      {
        position: 1,
        text: "Value tweet",
        hashtags: [],
        hasImage: true,
        imagePrompt: "image prompt 1",
        charCount: 30,
      },
      {
        position: 2,
        text: "CTA tweet",
        hashtags: [],
        hasImage: true,
        imagePrompt: "image prompt 2",
        charCount: 25,
      },
    ]);

    mockGenerateText
      .mockResolvedValueOnce({ text: RESEARCH_JSON } as Awaited<ReturnType<typeof generateText>>)
      .mockResolvedValueOnce({ text: strategyAllImages } as Awaited<
        ReturnType<typeof generateText>
      >);

    mockStreamText
      .mockReturnValueOnce({ text: Promise.resolve(tweetsAllImages) })
      .mockReturnValueOnce({ text: Promise.resolve(REVIEW_JSON) });

    // First call succeeds, second fails, third succeeds
    mockGenerateAgenticImage
      .mockResolvedValueOnce({ url: "https://img1.example.com" })
      .mockResolvedValueOnce({ error: "Replicate timeout" })
      .mockResolvedValueOnce({ url: "https://img3.example.com" });

    const onProgress = vi.fn();
    const params = makeBaseParams(onProgress);

    // Should not throw
    const result = await runAgenticPipeline(params);

    // Tweet 0 has image URL
    const tweet0 = result.tweets.find((t) => t.position === 0);
    expect(tweet0?.imageUrl).toBe("https://img1.example.com");

    // Tweet 1 failed — imageUrl should not be set (undefined or null)
    const tweet1 = result.tweets.find((t) => t.position === 1);
    expect(tweet1?.imageUrl == null).toBe(true);

    // Tweet 2 has image URL
    const tweet2 = result.tweets.find((t) => t.position === 2);
    expect(tweet2?.imageUrl).toBe("https://img3.example.com");

    // images step emitted "complete" (pipeline didn't abort)
    const progressCalls = onProgress.mock.calls.map((c) => c[0] as PipelineProgressEvent);
    expect(progressCalls.some((e) => e.step === "images" && e.status === "complete")).toBe(true);
  });

  // ── Test 4: Free tier enforces short length ───────────────────────────────
  it("forces lengthOption to short on free tier even if AI returns medium", async () => {
    const strategyMedium = JSON.stringify({
      format: "thread",
      lengthOption: "medium", // AI misbehaved and returned medium
      tweetCount: 5,
      tone: "professional",
      structure: "hook → value → CTA",
      imageSlots: [],
      rationale: "Medium for depth",
    });

    const tweetsNoImages = JSON.stringify([
      { position: 0, text: "Hook tweet", hashtags: [], hasImage: false, charCount: 50 },
      { position: 1, text: "Value tweet", hashtags: [], hasImage: false, charCount: 30 },
    ]);

    mockGenerateText
      .mockResolvedValueOnce({ text: RESEARCH_JSON } as Awaited<ReturnType<typeof generateText>>)
      .mockResolvedValueOnce({ text: strategyMedium } as Awaited<ReturnType<typeof generateText>>);

    mockStreamText
      .mockReturnValueOnce({ text: Promise.resolve(tweetsNoImages) })
      .mockReturnValueOnce({ text: Promise.resolve(REVIEW_JSON) });

    mockCanPostLongContent.mockReturnValue(false);

    const onProgress = vi.fn();
    const params = { ...makeBaseParams(onProgress), xSubscriptionTier: "None" as const };

    await runAgenticPipeline(params);

    // buildWritingPrompt second argument (plan) should have lengthOption === "short"
    expect(mockBuildWritingPrompt).toHaveBeenCalledTimes(1);
    const planArg = mockBuildWritingPrompt.mock.calls[0]![1] as { lengthOption: string };
    expect(planArg.lengthOption).toBe("short");
  });

  // ── Test 5: onProgress events emitted in correct order ───────────────────
  it("emits progress events in the correct sequence", async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: RESEARCH_JSON } as Awaited<ReturnType<typeof generateText>>)
      .mockResolvedValueOnce({ text: STRATEGY_JSON } as Awaited<ReturnType<typeof generateText>>);

    mockStreamText
      .mockReturnValueOnce({ text: Promise.resolve(TWEETS_JSON) })
      .mockReturnValueOnce({ text: Promise.resolve(REVIEW_JSON) });

    mockGenerateAgenticImage.mockResolvedValue({ url: "https://stored.example.com/img.png" });

    const onProgress = vi.fn();
    const params = makeBaseParams(onProgress);

    await runAgenticPipeline(params);

    const events = onProgress.mock.calls
      .map((c) => c[0] as PipelineProgressEvent)
      .map((e) => ({ step: e.step, status: e.status }));

    const expectedSequence = [
      { step: "research", status: "in_progress" },
      { step: "research", status: "complete" },
      { step: "strategy", status: "in_progress" },
      { step: "strategy", status: "complete" },
      { step: "writing", status: "in_progress" },
      { step: "writing", status: "complete" },
      { step: "images", status: "in_progress" },
      { step: "images", status: "complete" },
      { step: "review", status: "in_progress" },
      { step: "review", status: "complete" },
      // "done" is emitted by the route handler after DB update, not by the pipeline itself
      // NOTE: "streaming" events are not tested here — the mock streamText doesn't invoke onChunk
    ];

    // Verify each expected event appears in the emitted events in the correct relative order
    let lastIndex = -1;
    for (const expected of expectedSequence) {
      const idx = events.findIndex(
        (e, i) => i > lastIndex && e.step === expected.step && e.status === expected.status
      );
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });
});
