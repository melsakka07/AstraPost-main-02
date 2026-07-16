import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("@/lib/services/ai-quota", () => ({
  recordAiUsage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/db", () => ({
  db: {},
}));
import {
  generateImage,
  createImageProvider,
  getDimensionsFromAspectRatio,
  buildStyledPrompt,
  validateModelForPlan,
  type ImageModel,
} from "../ai-image";

// Mock fetch for Replicate API
global.fetch = vi.fn();

describe("AI Image Service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, REPLICATE_API_TOKEN: "test-token" };
    vi.mocked(global.fetch).mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.mocked(global.fetch).mockReset();
  });

  describe("Utility Functions", () => {
    it("should calculate correct dimensions for aspect ratios", () => {
      expect(getDimensionsFromAspectRatio("1:1")).toEqual({ width: 1024, height: 1024 });
      expect(getDimensionsFromAspectRatio("3:2")).toEqual({ width: 1536, height: 1024 });
      expect(getDimensionsFromAspectRatio("2:3")).toEqual({ width: 1024, height: 1536 });
    });

    it("should build styled prompt from template", () => {
      const prompt = "a cat";
      const styled = buildStyledPrompt(prompt, "photorealistic");
      expect(styled).toContain("a cat");
      expect(styled).toContain("Photorealistic");
      expect(styled).toContain("8k");
      expect(styled).toContain("Professional photography of");
    });

    it("should validate model availability", () => {
      const available: ImageModel[] = ["gpt-image-2"];

      expect(validateModelForPlan("gpt-image-2", available).valid).toBe(true);
      expect(validateModelForPlan("gpt-image-2", []).valid).toBe(false);
    });
  });

  describe("Provider Factory", () => {
    it("should throw — deprecated, use startImageGeneration() instead", () => {
      expect(() => createImageProvider("gpt-image-2")).toThrow(
        "Synchronous provider factory is deprecated. Use startImageGeneration() instead."
      );
    });
  });

  describe("Image Generation", () => {
    it("should throw — deprecated, use startImageGeneration() instead", async () => {
      await expect(
        generateImage({
          prompt: "test prompt",
          aspectRatio: "1:1",
          model: "gpt-image-2",
        })
      ).rejects.toThrow("generateImage is deprecated. Use startImageGeneration() instead.");
    });
  });
});
