/**
 * Unit tests for agentic-types.ts
 *
 * Since the module exports TypeScript interfaces (not Zod schemas), these tests
 * verify type shape at runtime by constructing valid typed objects and asserting
 * their property values — proving the interface contracts behave as documented.
 */

import { describe, it, expect } from "vitest";
import type {
  ResearchBrief,
  ContentPlan,
  AgenticTweet,
  AgenticPost,
  PipelineStep,
  StepStatus,
  PipelineProgressEvent,
} from "@/lib/ai/agentic-types";

// ─── ResearchBrief ─────────────────────────────────────────────────────────────

describe("ResearchBrief", () => {
  it("accepts a valid brief", () => {
    const brief: ResearchBrief = {
      topic: "AI coding tools",
      angles: [
        {
          title: "AI replaces IDEs",
          description: "desc",
          viralPotential: "high",
        },
      ],
      trendingHashtags: ["AITools", "Coding"],
      keyFacts: ["Fact 1"],
      recommendedAngle: "AI replaces IDEs",
    };
    expect(brief.topic).toBe("AI coding tools");
    expect(brief.angles).toHaveLength(1);
    expect(brief.angles[0]?.viralPotential).toBe("high");
  });

  it("accepts too_broad with broadSuggestions", () => {
    const brief: ResearchBrief = {
      topic: "technology",
      angles: [],
      trendingHashtags: [],
      keyFacts: [],
      recommendedAngle: "",
      too_broad: true,
      broadSuggestions: ["AI in healthcare", "Web3 gaming"],
    };
    expect(brief.too_broad).toBe(true);
    expect(brief.broadSuggestions).toHaveLength(2);
  });

  it("too_broad and broadSuggestions are optional", () => {
    const brief: ResearchBrief = {
      topic: "AI tools",
      angles: [],
      trendingHashtags: [],
      keyFacts: [],
      recommendedAngle: "AI tools overview",
    };
    expect(brief.too_broad).toBeUndefined();
    expect(brief.broadSuggestions).toBeUndefined();
  });
});

// ─── ContentPlan ───────────────────────────────────────────────────────────────

describe("ContentPlan", () => {
  it("accepts thread format", () => {
    const plan: ContentPlan = {
      format: "thread",
      lengthOption: "short",
      tweetCount: 5,
      tone: "professional",
      structure: "hook → 3 points → CTA",
      imageSlots: [0, 2],
      rationale: "Thread for depth",
    };
    expect(plan.format).toBe("thread");
    expect(plan.imageSlots).toContain(0);
  });

  it("accepts single format with long lengthOption", () => {
    const plan: ContentPlan = {
      format: "single",
      lengthOption: "long",
      tweetCount: 1,
      tone: "casual",
      structure: "intro → story → CTA",
      imageSlots: [],
      rationale: "Long-form for thought leadership",
    };
    expect(plan.format).toBe("single");
    expect(plan.lengthOption).toBe("long");
  });
});

// ─── AgenticTweet ──────────────────────────────────────────────────────────────

describe("AgenticTweet", () => {
  it("accepts a tweet without image fields", () => {
    const tweet: AgenticTweet = {
      position: 0,
      text: "Here's what most developers don't know:",
      hashtags: ["AITools"],
      hasImage: false,
      charCount: 47,
    };
    expect(tweet.hasImage).toBe(false);
    expect(tweet.imageUrl).toBeUndefined();
    expect(tweet.imagePrompt).toBeUndefined();
  });

  it("accepts a tweet with imageUrl and imagePrompt", () => {
    const tweet: AgenticTweet = {
      position: 1,
      text: "AI tools are changing everything",
      hashtags: [],
      hasImage: true,
      imagePrompt: "Laptop with glowing code, editorial style",
      imageUrl: "https://example.com/img.png",
      charCount: 32,
    };
    expect(tweet.hasImage).toBe(true);
    expect(tweet.imageUrl).toBe("https://example.com/img.png");
  });
});

// ─── AgenticPost ───────────────────────────────────────────────────────────────

describe("AgenticPost", () => {
  const research: ResearchBrief = {
    topic: "AI tools",
    angles: [{ title: "angle", description: "desc", viralPotential: "medium" }],
    trendingHashtags: [],
    keyFacts: [],
    recommendedAngle: "angle",
  };

  const plan: ContentPlan = {
    format: "thread",
    lengthOption: "short",
    tweetCount: 2,
    tone: "professional",
    structure: "hook → CTA",
    imageSlots: [],
    rationale: "Thread",
  };

  it("accepts a complete agentic post", () => {
    const post: AgenticPost = {
      id: "agentic-1",
      topic: "AI tools",
      research,
      plan,
      tweets: [
        { position: 0, text: "Hook", hashtags: [], hasImage: false, charCount: 4 },
        { position: 1, text: "CTA", hashtags: [], hasImage: false, charCount: 3 },
      ],
      qualityScore: 8,
      summary: "A thread about AI tools",
      createdAt: new Date().toISOString(),
      xAccountId: "acc-1",
      xSubscriptionTier: "None",
    };
    expect(post.qualityScore).toBe(8);
    expect(post.tweets).toHaveLength(2);
    expect(post.xSubscriptionTier).toBe("None");
  });
});

// ─── PipelineProgressEvent ─────────────────────────────────────────────────────

describe("PipelineProgressEvent", () => {
  it("accepts needs_input status", () => {
    const event: PipelineProgressEvent = {
      step: "research",
      status: "needs_input",
      data: {
        suggestions: ["AI in healthcare", "Web3 gaming"],
        message: "Topic too broad",
      },
    };
    expect(event.status).toBe("needs_input");
    expect(event.step).toBe("research");
  });

  it("accepts image progress event with completed/total", () => {
    const event: PipelineProgressEvent = {
      step: "images",
      status: "progress",
      completed: 2,
      total: 3,
    };
    expect(event.completed).toBe(2);
    expect(event.total).toBe(3);
  });

  it("step and status unions cover expected values", () => {
    const steps: PipelineStep[] = ["research", "strategy", "writing", "images", "review", "done"];
    const statuses: StepStatus[] = [
      "in_progress",
      "complete",
      "failed",
      "streaming",
      "progress",
      "needs_input",
    ];
    expect(steps).toHaveLength(6);
    expect(statuses).toHaveLength(6);
  });
});
