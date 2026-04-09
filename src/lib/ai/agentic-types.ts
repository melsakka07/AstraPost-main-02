import { z } from "zod";
import type { XSubscriptionTier } from "@/lib/schemas/common";

// Step 1 output
export interface ResearchBrief {
  topic: string;
  angles: Array<{ title: string; description: string; viralPotential: "high" | "medium" | "low" }>;
  trendingHashtags: string[];
  keyFacts: string[];
  recommendedAngle: string;
  too_broad?: boolean | undefined;
  broadSuggestions?: string[] | undefined;
}

// Step 2 output
export interface ContentPlan {
  format: "single" | "thread";
  lengthOption: "short" | "medium" | "long";
  tweetCount: number;
  tone: string;
  structure: string;
  imageSlots: number[];
  rationale: string;
}

// Step 3 output (per tweet)
export interface AgenticTweet {
  position: number;
  text: string;
  hashtags: string[];
  hasImage: boolean;
  imagePrompt?: string | undefined;
  imageUrl?: string | undefined;
  charCount: number;
}

// Step 5 output (final)
export interface AgenticPost {
  id: string;
  topic: string;
  research: ResearchBrief;
  plan: ContentPlan;
  tweets: AgenticTweet[];
  qualityScore: number;
  summary: string;
  createdAt: string;
  xAccountId: string;
  xSubscriptionTier: XSubscriptionTier;
}

// ── Zod schemas (for runtime validation in route handlers) ────────────────────

export const ResearchBriefSchema = z.object({
  topic: z.string(),
  angles: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      viralPotential: z.enum(["high", "medium", "low"]),
    })
  ),
  trendingHashtags: z.array(z.string()),
  keyFacts: z.array(z.string()),
  recommendedAngle: z.string(),
  too_broad: z.boolean().optional(),
  broadSuggestions: z.array(z.string()).optional(),
});

export const ContentPlanSchema = z.object({
  format: z.enum(["single", "thread"]),
  lengthOption: z.enum(["short", "medium", "long"]),
  tweetCount: z.number().int().min(1).max(10),
  tone: z.string(),
  structure: z.string(),
  imageSlots: z.array(z.number()),
  rationale: z.string(),
});

export const AgenticTweetSchema = z.object({
  position: z.number().int().min(0),
  text: z.string(),
  hashtags: z.array(z.string()),
  hasImage: z.boolean(),
  imagePrompt: z.string().optional(),
  imageUrl: z.string().optional(),
  charCount: z.number().int().min(0),
});

export const AgenticTweetsSchema = z.array(AgenticTweetSchema);

export type PipelineStep = "research" | "strategy" | "writing" | "images" | "review" | "done";
export type StepStatus =
  | "in_progress"
  | "complete"
  | "failed"
  | "streaming"
  | "progress"
  | "needs_input";

export interface PipelineProgressEvent {
  step: PipelineStep;
  status: StepStatus;
  data?: unknown;
  tweet?: AgenticTweet;
  completed?: number;
  total?: number;
}
