/**
 * Builds OpenRouter's native fallback chain for text generation.
 *
 * Pass model ids in preference order. The first available model serves the
 * request and OpenRouter automatically routes to the next one on 429 / 5xx /
 * transient upstream errors — so a single flaky model (e.g. a rate-limited
 * free tier) no longer turns into a hard 500.
 *
 * Returns `undefined` when fewer than two distinct models are supplied (a
 * single model needs no fallback array). Falsy/duplicate ids are dropped while
 * preserving order.
 *
 * Mirrors the chain configured in `aiPreamble()` so every text-generation call
 * site is uniformly resilient. Spread the result into an OpenRouter settings
 * object: `openrouter(modelId, { ...(body && { extraBody: body }) })`.
 */
export function openrouterFallbackBody(
  ...modelIds: Array<string | undefined>
): { models: string[]; route: "fallback" } | undefined {
  const models = [...new Set(modelIds.filter((id): id is string => Boolean(id)))];
  return models.length > 1 ? { models, route: "fallback" } : undefined;
}
