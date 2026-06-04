import { describe, expect, it } from "vitest";
import { providerForGeneration, TRACKED_PROVIDERS } from "../provider-map";

describe("providerForGeneration", () => {
  it("maps all OpenRouter text models to openrouter", () => {
    const textModels = [
      "anthropic/claude-sonnet-4-20250514",
      "anthropic/claude-opus-4-20250514",
      "google/gemini-2.5-pro",
      "google/gemini-2.5-flash",
      "openai/gpt-4o",
      "openai/o4-mini",
      "meta-llama/llama-4-maverick",
    ];
    for (const model of textModels) {
      expect(providerForGeneration("thread", model)).toBe("openrouter");
    }
  });

  it("maps image generations to replicate", () => {
    expect(providerForGeneration("image", "nano-banana")).toBe("replicate");
    expect(providerForGeneration("image", "nano-banana-pro")).toBe("replicate");
    expect(providerForGeneration("image", "nano-banana-2")).toBe("replicate");
  });

  it("maps the OpenAI image model to openai regardless of type", () => {
    expect(providerForGeneration("image", "gpt-image-2")).toBe("openai");
    expect(providerForGeneration("image", "gpt-image-1")).toBe("openai");
    expect(providerForGeneration(null, "dall-e-3")).toBe("openai");
  });

  it("returns unknown when there is no model", () => {
    expect(providerForGeneration(null, null)).toBe("unknown");
    expect(providerForGeneration("thread", null)).toBe("unknown");
  });

  it("treats a model string without an image type as openrouter text", () => {
    expect(providerForGeneration(null, "google/gemini-2.5-flash")).toBe("openrouter");
  });

  it("exposes the three internally-tracked providers", () => {
    expect(TRACKED_PROVIDERS).toEqual(["openrouter", "replicate", "openai"]);
  });
});
