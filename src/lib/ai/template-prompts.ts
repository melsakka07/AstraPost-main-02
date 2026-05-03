export const VERSION = "template:v3";

import { buildLanguageBlock } from "@/lib/ai/language";
import { JAILBREAK_GUARD, wrapUntrusted } from "@/lib/ai/untrusted";
import type { ToneCode } from "@/lib/constants";

export type OutputFormat = "single" | "thread-short" | "thread-long";

/** AI generation parameters stored alongside a saved user template. */
export interface TemplateAiMeta {
  templateId: string;
  tone: string;
  language: string;
  outputFormat: OutputFormat;
}

export interface TemplatePromptConfig {
  id: string;
  name: string;
  description: string;
  defaultTone: ToneCode;
  defaultFormat: OutputFormat;
  placeholderTopic: string;
  /** Few-shot examples for this template. Rides in the system prompt (cacheable). */
  examples?: { ar: string[]; en: string[] } | undefined;
  buildPrompt(
    topic: string,
    tone: ToneCode,
    language: string,
    format: OutputFormat,
    examples?: { ar: string[]; en: string[] } | undefined
  ): { system: string; messages: Array<{ role: "user"; content: string }> };
}

function tweetCountInstruction(format: OutputFormat): string {
  switch (format) {
    case "single":
      return "Output exactly 1 tweet.";
    case "thread-short":
      return "Output between 3 and 5 tweets (aim for 4). Choose the count that best serves the content — do not pad.";
    case "thread-long":
      return "Output between 5 and 10 tweets (aim for 7). Choose the count that best serves the content — do not pad.";
  }
}

/**
 * Static system-block: language, tone, hard rules, and jailbreak guard.
 * These are cacheable because the prefix (up to the variable parts) stays
 * stable across requests for the same language/tone.
 */
function systemBlock(
  tone: ToneCode,
  language: string,
  examples?: { ar: string[]; en: string[] } | undefined
): string {
  const langBlock = buildLanguageBlock(language, "social");

  let examplesBlock = "";
  if (examples) {
    const langExamples = language === "ar" ? examples.ar : examples.en;
    if (langExamples.length > 0) {
      examplesBlock = `\nExample tweets in this style:\n${langExamples.map((e) => `• ${e}`).join("\n")}\n`;
    }
  }

  return `${langBlock}
Tone: ${tone}.

Hard requirements:
- Aim for ~250 characters per tweet. The system enforces hard character limits server-side — no need to count.
- Do NOT include thread numbering like "1/5" or "Tweet 1:" anywhere in the tweet text.
- Do NOT output any explanation, commentary, headers, or meta-text. Only tweets.
- Match the ${tone} tone throughout — every tweet should feel consistent.

${examplesBlock}
${JAILBREAK_GUARD}`;
}

// ─── 5 Template Prompt Configs ───────────────────────────────────────────────

export const TEMPLATE_PROMPTS: TemplatePromptConfig[] = [
  {
    id: "educational-thread",
    name: "How-To Guide",
    description: "Teach your audience a new skill in simple steps.",
    defaultTone: "educational",
    defaultFormat: "thread-short",
    placeholderTopic: "e.g., Time management for remote developers",
    buildPrompt(topic, tone, language, format, examples) {
      const countInstruction = tweetCountInstruction(format);

      const system = `You are an expert social media content writer for X (Twitter).
Write a How-To Guide thread about the topic below.

${systemBlock(tone, language, examples)}`;

      const userMessage = `${wrapUntrusted("TOPIC", topic)}

Content structure:
${
  format === "single"
    ? "Write 1 punchy how-to tweet: state the skill/outcome, give 2-3 quick actionable tips inline, end with a CTA."
    : `
- Tweet 1 (Hook): Grab attention by stating the skill or transformation the reader will gain. Use a question, surprising stat, or bold promise. Include a thread teaser (e.g., "Here's how 🧵").
- Middle tweets (Steps): Each tweet covers ONE clear, actionable step. Start with a number or emoji. Keep each step self-contained — useful even if read alone.
- Final tweet (Wrap-up): Summarise the key takeaway, add encouragement, and include a soft CTA (e.g., "Save this for later", "Which step will you try first?").
`
}
${countInstruction}`;

      return { system, messages: [{ role: "user", content: userMessage }] };
    },
  },

  {
    id: "storytelling-thread",
    name: "Personal Story",
    description: "Share a personal experience or lesson learned.",
    defaultTone: "casual",
    defaultFormat: "thread-short",
    placeholderTopic: "e.g., How I landed my first freelance client",
    examples: {
      ar: [
        "أرسلت ٢٠٠ بريد إلكتروني. تلقيت ١٩٧ رفضًا و٣ ردود فقط. أحد هذه الردود غير مساري المهني بالكامل. 'الحظ' ليس صدفة — إنه إصرار يرتدي قناعًا.",
        "قبل عام، تركت وظيفتي براتب ٦ أرقام دون خطة بديلة. ظن الجميع أنني فقدت عقلي. اليوم، مشروعي الخاص يحقق دخلًا أكبر من راتبي السابق. لكن المكسب الحقيقي لم يكن المال — بل هذا القرار...",
        "شخص غريب أرسل لي رسالة: 'محتواك ممل.' كدت أحظره. بدلًا من ذلك، سألته: لماذا؟ تلك المحادثة القصيرة علمتني عن الكتابة أكثر مما تعلمته في عامين كاملين. إليكم ما قاله...",
      ],
      en: [
        "I sent 200 cold emails. Got 197 rejections and 3 replies. One of those replies changed my career. Here's the part most people miss about 'luck': it's just persistence wearing a disguise.",
        "Last year I quit my 6-figure job with no backup plan. My family thought I'd lost it. Today I run a business that makes more than my old salary. But the real win wasn't the money — it was this one decision...",
        "A stranger DM'd me 'your content is boring.' I almost blocked them. Instead, I asked why. That 5-minute conversation taught me more about writing than 2 years of posting. Here's what they said...",
      ],
    },
    buildPrompt(topic, tone, language, format, examples) {
      const countInstruction = tweetCountInstruction(format);

      const system = `You are an expert social media content writer for X (Twitter).
Write a Personal Story thread about the topic below.

${systemBlock(tone, language, examples)}`;

      const userMessage = `${wrapUntrusted("TOPIC", topic)}

Content structure:
${
  format === "single"
    ? "Write 1 compelling story tweet: open with a relatable or surprising moment, give the core insight in 1-2 sentences, end with the lesson."
    : `
- Tweet 1 (Hook): Open with a vulnerable, surprising, or relatable moment that immediately draws the reader in. A single scene that makes them want more.
- Middle tweets (Story arc): Tell the story chronologically. One moment or turning point per tweet. Use specific details — numbers, feelings — to make it vivid. Avoid generic statements.
- Final tweet (Lesson): Distil the core lesson or advice others can apply. End with something that invites connection ("Have you experienced this? 👇").
`
}
${countInstruction}`;

      return { system, messages: [{ role: "user", content: userMessage }] };
    },
  },

  {
    id: "contrarian-take",
    name: "Contrarian Take",
    description: "Challenge a common belief in your niche.",
    defaultTone: "viral",
    defaultFormat: "single",
    placeholderTopic: "e.g., Why hustle culture is making you less productive",
    examples: {
      ar: [
        "رأي غير شائع: 'التوازن بين العمل والحياة' خرافة يروج لها من وصل بالفعل. أول 5 سنوات من بناء أي شيء حقيقي تتطلب هوسًا كاملًا. السؤال ليس هل هو متوازن — بل هل يستحق العناء.",
        "معظم نصائح 'الإنتاجية' مجرد مزيد من التسويف. لا تحتاج تطبيقًا جديدًا أو نظامًا معقدًا. تحتاج أن تقوم بالعمل الفعلي فقط. كل شيء آخر مجرد ضوضاء.",
        "أفضل نصيحة مهنية تلقيتها: 'توقف عن تحسين خطة الأمان قبل أن تبني شيئًا يستحق الحماية.' معظم الناس يخططون أكثر مما ينفذون. انشر أولًا، ثم حسّن لاحقًا.",
      ],
      en: [
        "Hot take: 'Work-life balance' is a myth sold by people who've already made it. The first 5 years of building anything meaningful require obsession. The question isn't whether it's balanced — it's whether it's worth it.",
        "Unpopular opinion: Most 'productivity advice' is just procrastination in disguise. You don't need another app or system. You need to do the actual work. Everything else is noise.",
        "The best career advice I ever got: 'Stop optimizing for safety before you've built anything worth protecting.' Most people over-plan and under-execute. Ship first, optimize later.",
      ],
    },
    buildPrompt(topic, tone, language, format, examples) {
      const countInstruction = tweetCountInstruction(format);

      const system = `You are an expert social media content writer for X (Twitter).
Write a Contrarian Take about the topic below.

${systemBlock(tone, language, examples)}`;

      const userMessage = `${wrapUntrusted("TOPIC", topic)}

Content structure:
${
  format === "single"
    ? "Write 1 bold contrarian tweet: state the unpopular opinion clearly in the first sentence, briefly hint at the reasoning, close with a question that invites debate."
    : `
- Tweet 1 (The take): State the contrarian opinion clearly, directly, and confidently. No hedging. Can open with "Hot take:", "Unpopular opinion:", or a direct bold statement.
- Middle tweets (The case): Each tweet presents ONE piece of evidence or counter-intuitive insight. Be specific — cite data, examples, or personal observations.
- Final tweet (Call for debate): End with a question or challenge that invites discussion. Acknowledge the other side briefly, then restate your conviction.
`
}
${countInstruction}`;

      return { system, messages: [{ role: "user", content: userMessage }] };
    },
  },

  {
    id: "listicle-thread",
    name: "Curated List",
    description: "Share a list of tools, resources, or tips.",
    defaultTone: "professional",
    defaultFormat: "thread-long",
    placeholderTopic: "e.g., 7 productivity tools that save me 5 hours a week",
    buildPrompt(topic, tone, language, format, examples) {
      const countInstruction = tweetCountInstruction(format);

      const system = `You are an expert social media content writer for X (Twitter).
Write a Curated List thread about the topic below.

${systemBlock(tone, language, examples)}`;

      const userMessage = `${wrapUntrusted("TOPIC", topic)}

Content structure:
${
  format === "single"
    ? "Write 1 list tweet: frame the topic with a number and benefit hook, inline 3-5 items with brief descriptions, close with a CTA."
    : `
- Tweet 1 (Hook): Frame the list with a clear number and the benefit (e.g., "7 tools that save you 5 hours/week 🧵"). Make the value immediately obvious. Add a thread signal.
- List item tweets: Each tweet = ONE item. Lead with the item name (caps or emoji), then 1-2 sentences on what it does and WHY it matters. Be specific and useful.
- Final tweet (Bonus + CTA): Add a bonus pick not in the main list. End with a CTA: "Follow for more", "Which will you try?", or "Repost to help others."
`
}
${countInstruction}`;

      return { system, messages: [{ role: "user", content: userMessage }] };
    },
  },

  {
    id: "product-launch",
    name: "Product Launch",
    description: "Announce a new product or feature.",
    defaultTone: "inspirational",
    defaultFormat: "thread-short",
    placeholderTopic: "e.g., Launching my new course on personal finance for beginners",
    buildPrompt(topic, tone, language, format, examples) {
      const countInstruction = tweetCountInstruction(format);

      const system = `You are an expert social media content writer for X (Twitter).
Write a Product Launch announcement thread about the topic below.

${systemBlock(tone, language, examples)}`;

      const userMessage = `${wrapUntrusted("TOPIC", topic)}

Content structure:
${
  format === "single"
    ? "Write 1 high-energy launch tweet: lead with the big news and excitement, state the core benefit in one sentence, close with a clear CTA (link, signup, or how to learn more)."
    : `
- Tweet 1 (Announcement): Open with the BIG news — energy and excitement. State what it is and why it matters in one punchy sentence. Add a thread signal.
- Feature/benefit tweets: Each tweet spotlights ONE feature or benefit. Lead with the user benefit. Use "You can now…", "Finally…", "No more…" framing.
- Social proof tweet (if format allows): Share early results, beta feedback, a compelling stat, or the story behind building it. Makes the launch feel real.
- Final tweet (CTA): Direct, clear call-to-action. Tell people exactly what to do next. Add urgency or exclusivity only if genuine.
`
}
${countInstruction}`;

      return { system, messages: [{ role: "user", content: userMessage }] };
    },
  },
];

// ─── Lookup helper ────────────────────────────────────────────────────────────

export function getTemplatePrompt(templateId: string): TemplatePromptConfig | undefined {
  return TEMPLATE_PROMPTS.find((t) => t.id === templateId);
}
