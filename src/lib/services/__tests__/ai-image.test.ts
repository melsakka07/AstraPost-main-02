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
      expect(getDimensionsFromAspectRatio("16:9")).toEqual({ width: 1344, height: 768 });
      expect(getDimensionsFromAspectRatio("9:16")).toEqual({ width: 768, height: 1344 });
    });

    it("should append style modifiers to prompt", () => {
      const prompt = "a cat";
      const styled = buildStyledPrompt(prompt, "photorealistic");
      expect(styled).toContain("a cat");
      expect(styled).toContain("photorealistic");
      expect(styled).toContain("8k");
    });

    it("should validate model availability", () => {
      const available = ["nano-banana-2"] as any[];

      expect(validateModelForPlan("nano-banana-2", available).valid).toBe(true);
      expect(validateModelForPlan("nano-banana-pro", available).valid).toBe(false);
    });
  });

  describe("Provider Factory", () => {
    it("should return correct provider instance", () => {
      const p1 = createImageProvider("nano-banana-2");
      expect(p1.name).toBe("nano-banana-2");

      const p2 = createImageProvider("nano-banana-pro");
      expect(p2.name).toBe("nano-banana-pro");
    });

    it("should throw on unknown model", () => {
      expect(() => createImageProvider("unknown" as any)).toThrow();
    });
  });

  describe("Image Generation", () => {
    it("should generate image successfully", async () => {
      // Mock successful Replicate API response
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (typeof url === "string" && url.includes("/predictions")) {
          // Create prediction
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: "test-prediction-id",
              status: "succeeded",
              output: "https://replicate.example.com/image.png",
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      });

      const result = await generateImage({
        prompt: "test prompt",
        aspectRatio: "1:1",
        model: "nano-banana-2",
      });

      expect(result).toEqual({
        imageUrl: "https://replicate.example.com/image.png",
        width: 1024,
        height: 1024,
        model: "nano-banana-2",
        prompt: "test prompt",
      });
    });

    it("should fail if API key is missing", async () => {
      delete process.env.REPLICATE_API_TOKEN;

      await expect(
        generateImage({
          prompt: "test",
          aspectRatio: "1:1",
          model: "nano-banana-2",
        })
      ).rejects.toThrow("REPLICATE_API_TOKEN environment variable is not set");
    });
  });
});
