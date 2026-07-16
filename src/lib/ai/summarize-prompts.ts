import "server-only";
import { getArabicToneGuidance } from "@/lib/ai/arabic-prompt";
import { buildLanguageBlock } from "@/lib/ai/language";
import { wrapUntrusted, JAILBREAK_GUARD } from "@/lib/ai/untrusted";

interface BuildSummarizePromptArgs {
  variant: "article" | "report";
  language: "ar" | "en";
  tone: string;
  tweetCount: number;
  title: string;
  body: string;
  bodyMaxChars: number;
  /** Max characters per tweet. Defaults to 280 if not provided. */
  maxChars?: number;
}

export const SUMMARIZE_PROMPT_VERSION = "summarize:v2";
export const PDF_TO_THREAD_PROMPT_VERSION = "pdf_to_thread:v1";

export function buildSummarizePrompt(args: BuildSummarizePromptArgs): {
  system: string;
  prompt: string;
} {
  const { variant, language, tone, tweetCount, title, body, bodyMaxChars, maxChars = 280 } = args;
  const langBlock = buildLanguageBlock(language, "social");
  const toneGuidance = language === "ar" ? getArabicToneGuidance(tone) : `Tone: ${tone}.`;

  const intro =
    variant === "report"
      ? `You are an expert business analyst and social media writer for X (Twitter).\nRead the following REPORT or DOCUMENT and write a ${tweetCount}-tweet thread that surfaces the most actionable insights for a professional audience.`
      : `You are an expert social media writer for X (Twitter).\nRead the following article and write a ${tweetCount}-tweet thread that summarizes or comments on it.`;

  const reportSpecificRules =
    variant === "report"
      ? `\n- Lead with the SINGLE most important insight in tweet 1 (not a generic hook).\n- Quote specific numbers, percentages, or findings where present.\n- Each middle tweet covers ONE key insight or section — no rambling synthesis.\n- Avoid corporate jargon unless the source uses it.\n- Final tweet: a concrete takeaway or "what this means for you" framing.`
      : `\n- Make the thread engaging, informative, and shareable.\n- Start with a hook tweet that grabs attention.\n- End with a takeaway or call-to-action tweet.`;

  const titleLabel = variant === "report" ? "DOCUMENT TITLE" : "ARTICLE TITLE";
  const textLabel = variant === "report" ? "DOCUMENT TEXT" : "ARTICLE TEXT";

  const system = `${intro}
${langBlock}
${toneGuidance}
Auto-detect the source language and note it in sourceLanguage.

Constraints:
- Each tweet MUST be strictly under ${maxChars} characters.
- Do NOT include tweet numbering in the text.${reportSpecificRules}

${JAILBREAK_GUARD}`;

  const prompt = `${titleLabel}: ${title}
${wrapUntrusted(textLabel, body, bodyMaxChars)}`;

  return { system, prompt };
}
