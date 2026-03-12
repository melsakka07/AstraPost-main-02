
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateImage,
  createImageProvider,
  getDimensionsFromAspectRatio,
  buildStyledPrompt,
  validateModelForPlan,
} from "../ai-image";

// Mock @google/genai
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(function () {
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: "image/png",
                        data: "base64encodedimage",
                      },
                    },
                  ],
                },
              },
            ],
          }),
        },
      };
    }),
  };
});

describe("AI Image Service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, GEMINI_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
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
      const available = ["nano-banana-2", "banana-pro"] as any[];
      
      expect(validateModelForPlan("nano-banana-2", available).valid).toBe(true);
      expect(validateModelForPlan("banana-pro", available).valid).toBe(true);
      expect(validateModelForPlan("gemini-imagen4", available).valid).toBe(false);
    });
  });

  describe("Provider Factory", () => {
    it("should return correct provider instance", () => {
      const p1 = createImageProvider("nano-banana-2");
      expect(p1.name).toBe("nano-banana-2");

      const p2 = createImageProvider("banana-pro");
      expect(p2.name).toBe("banana-pro");

      const p3 = createImageProvider("gemini-imagen4");
      expect(p3.name).toBe("gemini-imagen4");
    });

    it("should throw on unknown model", () => {
      expect(() => createImageProvider("unknown" as any)).toThrow();
    });
  });

  describe("Image Generation", () => {
    it("should generate image successfully", async () => {
      const result = await generateImage({
        prompt: "test prompt",
        aspectRatio: "1:1",
        model: "nano-banana-2",
      });

      expect(result).toEqual({
        imageUrl: "data:image/png;base64,base64encodedimage",
        width: 1024,
        height: 1024,
        model: "nano-banana-2",
        prompt: "test prompt",
      });
    });

    it("should fail if API key is missing", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_AI_API_KEY;

      await expect(
        generateImage({
          prompt: "test",
          aspectRatio: "1:1",
          model: "nano-banana-2",
        })
      ).rejects.toThrow("GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable is not set");
    });
  });
});
