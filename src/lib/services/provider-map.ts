/**
 * Maps a stored `ai_generations` row (its generation `type` + `model` string) to
 * the upstream paid provider that served it. This is the single source of the
 * "provider" dimension used by the Operations Center consumption dashboard.
 *
 * Pure logic, no I/O — safe to import anywhere and unit-test directly.
 *
 * Facts this encodes (verified against the codebase):
 * - All text generation runs through OpenRouter (`MODEL_PRICING` keys in `ai-quota.ts`).
 * - Image generation (`type === "image"`) runs on Replicate (`ai-image.ts`),
 *   except the OpenAI image model (`gpt-image-2`).
 * - Deepgram (transcription) is NOT recorded in `ai_generations`, so it never
 *   appears here — it is surfaced via connectivity only.
 */

export type Provider = "openrouter" | "replicate" | "openai" | "unknown";

/** Providers that AstraPost records spend for in `ai_generations`. */
export const TRACKED_PROVIDERS: readonly Provider[] = [
  "openrouter",
  "replicate",
  "openai",
] as const;

/**
 * Returns the upstream provider for a generation given its type and model string.
 */
export function providerForGeneration(
  type: string | null | undefined,
  model: string | null | undefined
): Provider {
  // OpenAI-hosted image model is billed by OpenAI, not Replicate.
  if (model && /gpt-image|dall-?e/i.test(model)) return "openai";

  // Everything else flagged as an image generation runs on Replicate.
  if (type === "image") return "replicate";

  // Any remaining model string is a text model served by OpenRouter.
  if (model) return "openrouter";

  return "unknown";
}
