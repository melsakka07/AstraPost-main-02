import { type XSubscriptionTier } from "@/lib/schemas/common";
import { canPostLongContent } from "@/lib/services/x-subscription";

// --- Length option definitions ---

export const AI_LENGTH_OPTIONS = {
  short: {
    id: "short",
    label: "Short",
    description: "Punchy, high-engagement tweet",
    maxChars: 280,
    minChars: 1,
    requiresPremium: false,
  },
  medium: {
    id: "medium",
    label: "Medium",
    description: "Nuanced take, mini-essay, or detailed opinion",
    maxChars: 1_000,
    minChars: 281,
    requiresPremium: true,
  },
  long: {
    id: "long",
    label: "Long",
    description: "Thought leadership, in-depth analysis, or storytelling",
    maxChars: 2_000,
    minChars: 1_001,
    requiresPremium: true,
  },
} as const;

export type AiLengthOptionId = keyof typeof AI_LENGTH_OPTIONS;

// --- Helpers ---

export function getAvailableLengthOptions(tier: XSubscriptionTier | null) {
  if (canPostLongContent(tier)) {
    return [AI_LENGTH_OPTIONS.short, AI_LENGTH_OPTIONS.medium, AI_LENGTH_OPTIONS.long];
  }
  return [AI_LENGTH_OPTIONS.short];
}

export function isLengthOptionAllowed(
  optionId: AiLengthOptionId,
  tier: XSubscriptionTier | null,
): boolean {
  const option = AI_LENGTH_OPTIONS[optionId];
  return !option.requiresPremium || canPostLongContent(tier);
}
