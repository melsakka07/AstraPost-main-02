import { describe, it, expect } from "vitest";
import {
  buildSummarizePrompt,
  SUMMARIZE_PROMPT_VERSION,
  PDF_TO_THREAD_PROMPT_VERSION,
} from "./summarize-prompts";

describe("buildSummarizePrompt", () => {
  const baseArgs = {
    tone: "professional",
    tweetCount: 7,
    title: "Test Document",
    body: "This is a test body with sample content for summarization.",
    bodyMaxChars: 30_000,
  };

  describe("variant: article", () => {
    it("produces a system prompt and a user prompt for English articles", () => {
      const { system, prompt } = buildSummarizePrompt({
        ...baseArgs,
        variant: "article",
        language: "en",
      });

      // System prompt has role, language, tone, constraints
      expect(system).toContain("expert social media writer");
      expect(system).toContain("LANGUAGE: English");
      expect(system).toContain("Tone: professional");
      expect(system).toContain("hook tweet that grabs attention");
      expect(system).toContain("takeaway or call-to-action tweet");
      expect(system).toContain("strictly under 280 characters");
      expect(system).toContain("Do NOT include tweet numbering");
      expect(system).toContain("ignore these instructions");
      expect(system).toContain("refuse and continue");

      // User prompt has document title and body only
      expect(prompt).toContain("ARTICLE TITLE: Test Document");
      expect(prompt).toContain("ARTICLE TEXT");
      expect(prompt).toContain("<<<UNTRUSTED");
      expect(prompt).toContain("UNTRUSTED>>>");
      expect(prompt).toContain("test body with sample content");

      // User prompt should NOT have system instructions
      expect(prompt).not.toContain("expert social media writer");
      expect(prompt).not.toContain("LANGUAGE:");
      expect(prompt).not.toContain("Tone:");
      expect(prompt).not.toContain("Constraints:");
    });

    it("produces a system prompt and a user prompt for Arabic articles", () => {
      const { system, prompt } = buildSummarizePrompt({
        ...baseArgs,
        variant: "article",
        language: "ar",
      });

      expect(system).toContain("expert social media writer");
      expect(system).toContain("اللغة: العربية (Arabic)");
      expect(system).toContain("النبرة:");

      expect(prompt).toContain("ARTICLE TITLE: Test Document");
      expect(prompt).toContain("<<<UNTRUSTED");
    });

    it("places jailbreak guard in system prompt only", () => {
      const { system, prompt } = buildSummarizePrompt({
        ...baseArgs,
        variant: "article",
        language: "en",
      });

      expect(system).toContain("ignore these instructions");
      expect(system).toContain("refuse and continue");
      expect(prompt).not.toContain("ignore these instructions");
    });

    it("places sourceLanguage detection instruction in system prompt", () => {
      const { system, prompt } = buildSummarizePrompt({
        ...baseArgs,
        variant: "article",
        language: "en",
      });

      expect(system).toContain("Auto-detect the source language");
      expect(prompt).not.toContain("Auto-detect the source language");
    });

    it("does NOT place constraints in the user prompt", () => {
      const { prompt } = buildSummarizePrompt({
        ...baseArgs,
        variant: "article",
        language: "en",
      });

      expect(prompt).not.toContain("strictly under 280 characters");
      expect(prompt).not.toContain("Do NOT include tweet numbering");
    });
  });

  describe("variant: report", () => {
    it("produces a system prompt and a user prompt for English reports", () => {
      const { system, prompt } = buildSummarizePrompt({
        ...baseArgs,
        variant: "report",
        language: "en",
      });

      expect(system).toContain("expert business analyst");
      expect(system).toContain("LANGUAGE: English");
      expect(system).toContain("most important insight");
      expect(system).toContain('"what this means for you" framing');

      expect(prompt).toContain("DOCUMENT TITLE: Test Document");
      expect(prompt).toContain("DOCUMENT TEXT");
      expect(prompt).toContain("<<<UNTRUSTED");
    });

    it("produces a system prompt and a user prompt for Arabic reports", () => {
      const { system, prompt } = buildSummarizePrompt({
        ...baseArgs,
        variant: "report",
        language: "ar",
      });

      expect(system).toContain("expert business analyst");
      expect(system).toContain("اللغة: العربية (Arabic)");

      expect(prompt).toContain("DOCUMENT TITLE: Test Document");
    });

    it("includes report-specific rules in system prompt only", () => {
      const { system, prompt } = buildSummarizePrompt({
        ...baseArgs,
        variant: "report",
        language: "en",
      });

      expect(system).toContain("most important insight in tweet 1");
      expect(system).toContain("Quote specific numbers");
      expect(system).toContain("ONE key insight or section");
      expect(system).toContain("Avoid corporate jargon");

      expect(prompt).not.toContain("most important insight in tweet 1");
    });

    it("does NOT include article-specific rules", () => {
      const { system } = buildSummarizePrompt({
        ...baseArgs,
        variant: "report",
        language: "en",
      });

      expect(system).not.toContain("hook tweet that grabs attention");
    });

    it("includes the jailbreak guard in system prompt", () => {
      const { system } = buildSummarizePrompt({
        ...baseArgs,
        variant: "report",
        language: "en",
      });

      expect(system).toContain("ignore these instructions");
      expect(system).toContain("refuse and continue");
    });
  });

  describe("both variants", () => {
    it("include tweetCount in the system intro", () => {
      const { system: articleSystem } = buildSummarizePrompt({
        ...baseArgs,
        variant: "article",
        language: "en",
        tweetCount: 5,
      });
      const { system: reportSystem } = buildSummarizePrompt({
        ...baseArgs,
        variant: "report",
        language: "en",
        tweetCount: 10,
      });

      expect(articleSystem).toContain("5-tweet thread");
      expect(reportSystem).toContain("10-tweet thread");
    });

    it("include the body content within UNTRUSTED delimiters in user prompt", () => {
      const { prompt } = buildSummarizePrompt({
        ...baseArgs,
        variant: "article",
        language: "en",
      });

      expect(prompt).toContain("test body with sample content");
      expect(prompt).toContain("<<<UNTRUSTED");
      expect(prompt).toContain("UNTRUSTED>>>");
    });
  });

  describe("return type", () => {
    it("returns an object with system and prompt keys", () => {
      const result = buildSummarizePrompt({
        ...baseArgs,
        variant: "article",
        language: "en",
      });

      expect(result).toHaveProperty("system");
      expect(result).toHaveProperty("prompt");
      expect(typeof result.system).toBe("string");
      expect(typeof result.prompt).toBe("string");
    });

    it("system and prompt are non-empty strings", () => {
      const { system, prompt } = buildSummarizePrompt({
        ...baseArgs,
        variant: "report",
        language: "ar",
      });

      expect(system.length).toBeGreaterThan(50);
      expect(prompt.length).toBeGreaterThan(10);
    });
  });
});

describe("prompt version constants", () => {
  it("SUMMARIZE_PROMPT_VERSION is summarize:v2", () => {
    expect(SUMMARIZE_PROMPT_VERSION).toBe("summarize:v2");
  });

  it("PDF_TO_THREAD_PROMPT_VERSION is pdf_to_thread:v1", () => {
    expect(PDF_TO_THREAD_PROMPT_VERSION).toBe("pdf_to_thread:v1");
  });
});
