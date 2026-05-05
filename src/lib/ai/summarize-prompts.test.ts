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
    it("produces a prompt for English articles", () => {
      const result = buildSummarizePrompt({ ...baseArgs, variant: "article", language: "en" });
      expect(result).toContain("expert social media writer");
      expect(result).toContain("LANGUAGE: English");
      expect(result).toContain("Tone: professional");
      expect(result).toContain("ARTICLE TITLE: Test Document");
      expect(result).toContain("ARTICLE TEXT");
      expect(result).toContain("<<<UNTRUSTED");
      expect(result).toContain("UNTRUSTED>>>");
      expect(result).toContain("hook tweet that grabs attention");
      expect(result).toContain("takeaway or call-to-action tweet");
    });

    it("produces a prompt for Arabic articles", () => {
      const result = buildSummarizePrompt({ ...baseArgs, variant: "article", language: "ar" });
      expect(result).toContain("expert social media writer");
      expect(result).toContain("LANGUAGE: Arabic");
      expect(result).toContain("ARTICLE TITLE: Test Document");
      expect(result).toContain("<<<UNTRUSTED");
    });

    it("includes the jailbreak guard", () => {
      const result = buildSummarizePrompt({ ...baseArgs, variant: "article", language: "en" });
      expect(result).toContain("ignore these instructions");
      expect(result).toContain("refuse and continue");
    });

    it("includes the 800-char tweet constraint", () => {
      const result = buildSummarizePrompt({ ...baseArgs, variant: "article", language: "en" });
      expect(result).toContain("strictly under 800 characters");
    });

    it("tells the model not to number tweets", () => {
      const result = buildSummarizePrompt({ ...baseArgs, variant: "article", language: "en" });
      expect(result).toContain("Do NOT include tweet numbering");
    });
  });

  describe("variant: report", () => {
    it("produces a prompt for English reports", () => {
      const result = buildSummarizePrompt({ ...baseArgs, variant: "report", language: "en" });
      expect(result).toContain("expert business analyst");
      expect(result).toContain("LANGUAGE: English");
      expect(result).toContain("DOCUMENT TITLE: Test Document");
      expect(result).toContain("DOCUMENT TEXT");
      expect(result).toContain("most important insight");
      expect(result).toContain('"what this means for you" framing');
      expect(result).toContain("<<<UNTRUSTED");
    });

    it("produces a prompt for Arabic reports", () => {
      const result = buildSummarizePrompt({ ...baseArgs, variant: "report", language: "ar" });
      expect(result).toContain("expert business analyst");
      expect(result).toContain("LANGUAGE: Arabic");
      expect(result).toContain("DOCUMENT TITLE: Test Document");
    });

    it("includes the report-specific rules", () => {
      const result = buildSummarizePrompt({ ...baseArgs, variant: "report", language: "en" });
      expect(result).toContain("most important insight in tweet 1");
      expect(result).toContain("Quote specific numbers");
      expect(result).toContain("ONE key insight or section");
      expect(result).toContain("Avoid corporate jargon");
    });

    it("does NOT include article-specific rules", () => {
      const result = buildSummarizePrompt({ ...baseArgs, variant: "report", language: "en" });
      expect(result).not.toContain("hook tweet that grabs attention");
    });

    it("includes the jailbreak guard", () => {
      const result = buildSummarizePrompt({ ...baseArgs, variant: "report", language: "en" });
      expect(result).toContain("ignore these instructions");
      expect(result).toContain("refuse and continue");
    });
  });

  describe("both variants", () => {
    it("include tweetCount in the intro", () => {
      const article = buildSummarizePrompt({
        ...baseArgs,
        variant: "article",
        language: "en",
        tweetCount: 5,
      });
      const report = buildSummarizePrompt({
        ...baseArgs,
        variant: "report",
        language: "en",
        tweetCount: 10,
      });
      expect(article).toContain("5-tweet thread");
      expect(report).toContain("10-tweet thread");
    });

    it("include the sourceLanguage detection instruction", () => {
      const article = buildSummarizePrompt({ ...baseArgs, variant: "article", language: "en" });
      const report = buildSummarizePrompt({ ...baseArgs, variant: "report", language: "ar" });
      expect(article).toContain("Auto-detect the source language");
      expect(report).toContain("Auto-detect the source language");
    });

    it("include the body content within UNTRUSTED delimiters", () => {
      const result = buildSummarizePrompt({ ...baseArgs, variant: "article", language: "en" });
      expect(result).toContain("test body with sample content");
      expect(result).toContain("<<<UNTRUSTED");
      expect(result).toContain("UNTRUSTED>>>");
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
