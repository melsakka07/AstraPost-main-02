"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import type { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { UpgradeContext } from "@/components/ui/upgrade-modal";
import { type OutputFormat, type TemplatePromptConfig } from "@/lib/ai/template-prompts";
import type { useSession } from "@/lib/auth-client";
import { clientLogger } from "@/lib/client-logger";
import { LANGUAGES } from "@/lib/constants";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { TemplateAiMeta } from "@/lib/templates";
import { applyNumbering, detectTranslateTarget } from "./composer-utils";
import type { TweetDraft } from "./composer-types";

type Translator = (key: string, values?: Record<string, string | number | Date>) => string;
type Session = ReturnType<typeof useSession>["data"];
type OpenUpgradeModal = (context: UpgradeContext) => void;

interface UseComposerAiArgs {
  tweets: TweetDraft[];
  setTweets: Dispatch<SetStateAction<TweetDraft[]>>;
  updateTweet: (id: string, content: string) => void;
  setPreviewIndex: Dispatch<SetStateAction<number>>;
  targetAccountIds: string[];
  activeTweetId: string | null;
  handlePlanLimit: (res: Response, fallbackMessage: string) => Promise<void>;
  openUpgradeModal: OpenUpgradeModal;
  session: Session;
  searchParams: ReturnType<typeof useSearchParams>;
  t: Translator;
}

/**
 * Owns the composer's text-AI lifecycle: AI panel state, tone/language
 * preferences (localStorage + session sync), inspiration/template/history
 * handlers, and the streaming `handleAiRun` generator (thread, template, hook,
 * cta, translate, hashtags, rewrite). Behavior is identical to the inline
 * implementation it replaced.
 */
export function useComposerAi({
  tweets,
  setTweets,
  updateTweet,
  setPreviewIndex,
  targetAccountIds,
  activeTweetId,
  handlePlanLimit,
  openUpgradeModal,
  session,
  searchParams,
  t,
}: UseComposerAiArgs) {
  // AI State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // Phase 1: Added "inspire" and "template" to tool type (template for Phase 2)
  const [aiTool, setAiTool] = useState<
    "thread" | "inspire" | "template" | "hook" | "cta" | "rewrite" | "translate" | "hashtags"
  >("thread");
  const [aiTargetTweetId, setAiTargetTweetId] = useState<string | null>(null);
  const [aiTopic, setAiTopic] = useState("");
  const [aiHook, setAiHook] = useState("");
  // Phase 1: Inspiration state (moved from dialog to inline panel)
  const [inspirationTopics, setInspirationTopics] = useState<
    Array<{ topic: string; hook: string }>
  >([]);
  const [inspirationNiche, setInspirationNiche] = useState("Technology");
  const [isLoadingInspiration, setIsLoadingInspiration] = useState(false);
  // Phase 2: Template state (moved from dialog to inline panel)
  const [templateConfig, setTemplateConfig] = useState<TemplatePromptConfig | null>(null);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);
  const [templateFormat, setTemplateFormat] = useState<OutputFormat>("thread-short");
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  // P3-A: Restore AI tone + language from localStorage (session language takes priority once loaded)
  const [aiTone, setAiTone] = useState<string>("professional");
  const [aiCount, setAiCount] = useState([3]);
  const [aiLanguage, setAiLanguage] = useState<string>("en");
  const [aiLengthOption, setAiLengthOption] = useState<"short" | "medium" | "long">("short");
  const [aiRewriteText, setAiRewriteText] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("astra-ai-prefs") ?? "{}");
      if (saved.tone) setAiTone(saved.tone);
      if (saved.language) {
        setAiLanguage(saved.language);
      } else {
        const browserLang = navigator.language.split("-")[0] ?? "en";
        const supported: string[] = LANGUAGES.map((l) => l.code);
        if (supported.includes(browserLang)) setAiLanguage(browserLang);
      }
    } catch {
      // keep defaults
    }
  }, []);

  // UI language ≠ content language; default to user's content preference
  useEffect(() => {
    if (session?.user && "language" in session.user && (session.user as any).language) {
      setAiLanguage((session.user as any).language);
    }
    // Phase 4: Track plan for upsell banner
    if (session?.user && "plan" in session.user) {
      setUserPlan((session.user as { plan?: string }).plan ?? null);
    }
  }, [session?.user]);

  // P3-A: Persist AI tone + language preferences across sessions
  useEffect(() => {
    try {
      const existing = JSON.parse(localStorage.getItem("astra-ai-prefs") ?? "{}");
      localStorage.setItem(
        "astra-ai-prefs",
        JSON.stringify({ ...existing, tone: aiTone, language: aiLanguage })
      );
    } catch {
      // localStorage unavailable — non-critical
    }
  }, [aiTone, aiLanguage]);

  // Phase 4: Feedback/Refine — track the last AI generation ID for feedback buttons
  const [lastGenerationId, setLastGenerationId] = useState<string | null>(null);
  // Phase 4: Track user plan for upsell banner visibility
  const [userPlan, setUserPlan] = useState<string | null>(null);

  const [aiAddNumbering, setAiAddNumbering] = useState(true);
  const [aiTranslateTarget, setAiTranslateTarget] = useState<string>("en");

  // AI meta from the last template generation — stored so it can be saved with the template
  const [lastTemplateAiMeta, setLastTemplateAiMeta] = useState<TemplateAiMeta | null>(null);

  // Overwrite confirmation (C1)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [pendingTweets, setPendingTweets] = useState<TweetDraft[] | null>(null);
  // P2-F: Save original tweets before streaming so we can revert on overwrite rejection
  const preStreamTweetsRef = useRef<TweetDraft[] | null>(null);
  // P2-F: Track streaming progress and pending AI stream confirmation
  const [streamingTweetCount, setStreamingTweetCount] = useState(0);
  const [pendingAiStreamGenerate, setPendingAiStreamGenerate] = useState(false);
  // Phase 0: Undo snapshot for destructive operations
  const previousTweetsRef = useRef<TweetDraft[] | null>(null);
  // Phase 0: Translate confirmation dialog
  const [confirmTranslate, setConfirmTranslate] = useState(false);

  const openAiTool = (
    tool: "thread" | "inspire" | "template" | "hook" | "cta" | "rewrite" | "translate" | "hashtags",
    tweetId?: string
  ) => {
    setAiTool(tool);
    setGeneratedHashtags([]);
    // Phase 0: Hook now targets active tweet (same as rewrite/hashtags)
    if ((tool === "rewrite" || tool === "hashtags" || tool === "hook") && tweetId) {
      setAiTargetTweetId(tweetId);
      const targetTweet = tweets.find((x) => x.id === tweetId);
      setAiRewriteText(targetTweet?.content || "");
      setAiTranslateTarget(aiLanguage === "ar" ? "en" : "ar");
    } else {
      setAiTargetTweetId(null);
      setAiRewriteText("");
      if (tool === "translate") {
        // P3-D: Smart default — infer best target language from first tweet's content
        const firstContent =
          tweets.find((t) => t.id === (tweetId ?? activeTweetId ?? tweets[0]?.id))?.content ??
          tweets[0]?.content ??
          "";
        setAiTranslateTarget(detectTranslateTarget(firstContent, aiLanguage));
      } else {
        setAiTranslateTarget(aiLanguage === "ar" ? "en" : "ar");
      }
      if (tool === "thread") {
        setAiTopic((tweets[0]?.content?.trim() || "").slice(0, 500));
      }
    }
    setIsAiOpen(true);
  };

  // Phase 1: Inspiration handlers (moved from dialog to composer)
  const handleFetchInspiration = async () => {
    setIsLoadingInspiration(true);
    try {
      const res = await fetchWithAuth(
        `/api/ai/inspiration?niche=${inspirationNiche}&language=${aiLanguage}`
      );
      if (res.status === 402) {
        openUpgradeModal({ feature: "ai_writer" });
        return;
      }
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setInspirationTopics(data.topics || []);
    } catch (e) {
      clientLogger.error("Failed to load inspiration topics", {
        niche: inspirationNiche,
        error: e instanceof Error ? e.message : String(e),
      });
      toast.error(t("toasts.inspiration_load_failed"));
    } finally {
      setIsLoadingInspiration(false);
    }
  };

  const handleInspirationSelect = (topic: string, hook: string) => {
    setAiTopic(topic);
    setAiHook(hook);
    setAiTool("thread"); // Switch to Write tab
    toast.success(t("toasts.inspiration_topic_set"));
    // User manually clicks Generate - no auto-fire
  };

  // Phase 2: Template handlers (moved from dialog to inline panel)
  const handleTemplateConfigSelect = (config: TemplatePromptConfig) => {
    setTemplateConfig(config);
    setAiTone(config.defaultTone);
    setTemplateFormat(config.defaultFormat);
    setAiTopic("");
    setAiTool("template"); // Switch to Template tab
    setIsAiOpen(true); // Ensure panel is open
  };

  const restoreHistory = (item: any) => {
    const content = item.outputContent;
    if (!content) return;

    if (item.type === "thread" && content.tweets) {
      setTweets(
        content.tweets.map((t: string) => ({
          id: Math.random().toString(36).substr(2, 9),
          content: t,
          media: [],
        }))
      );
      setIsAiOpen(false);
      toast.success(t("toasts.history_restored_thread"));
    } else if (
      (item.type === "hook" || item.type === "rewrite" || item.type === "cta") &&
      content.text
    ) {
      if (aiTargetTweetId) {
        updateTweet(aiTargetTweetId, content.text);
      } else if (tweets[0]) {
        updateTweet(tweets[0].id, content.text);
      }
      setIsAiOpen(false);
      toast.success(t("toasts.history_restored_content"));
    } else if (item.type === "translate" && content.tweets) {
      setTweets(
        content.tweets.map((t: string, idx: number) => ({
          ...(tweets[idx] || { id: Math.random().toString(36).substr(2, 9), media: [] }),
          content: t,
        }))
      );
      setIsAiOpen(false);
      toast.success(t("toasts.history_restored_translation"));
    } else if (item.type === "hashtags" && content.hashtags) {
      setGeneratedHashtags(content.hashtags);
      setAiTool("hashtags");
      // Don't close, let them pick
    }
  };

  const restoreId = searchParams?.get("restore");

  useEffect(() => {
    if (restoreId) {
      fetchWithAuth(`/api/ai/history?id=${restoreId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.item) {
            restoreHistory(data.item);
            window.history.replaceState(null, "", "/dashboard/compose");
          }
        })
        .catch((e) => {
          clientLogger.error("Failed to restore AI history", {
            restoreId,
            error: e instanceof Error ? e.message : String(e),
          });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreId]);

  const handleTemplateSelect = (contents: string[], aiMeta?: TemplateAiMeta) => {
    const newTweets = contents.map((c) => ({
      id: Math.random().toString(36).substr(2, 9),
      content: c,
      media: [] as TweetDraft["media"],
    }));
    // Store AI meta so it can be embedded when saving as a template
    setLastTemplateAiMeta(aiMeta ?? null);
    // C1: ask before overwriting existing content (threshold: 50+ chars)
    if (tweets.some((t) => t.content.trim().length > 50)) {
      setPendingTweets(newTweets);
      setConfirmOverwrite(true);
      return;
    }
    setTweets(newTweets);
    setPreviewIndex(0);
    toast.success(t("toasts.template_applied"));
  };

  const handleAiRun = async (overrides?: {
    topic?: string;
    hook?: string;
    skipOverwriteCheck?: boolean;
    skipTranslateCheck?: boolean;
  }) => {
    setIsGenerating(true);
    try {
      const runTopic = overrides?.topic ?? aiTopic;
      const runHook = overrides?.hook ?? aiHook;
      if (aiTool === "thread") {
        if (!runTopic) throw new Error("Topic is required");
        const isSinglePost = tweets.length === 1;

        // P2-F: Pre-check overwrite guard BEFORE starting API call
        // Show confirmation dialog if user has substantive content
        if (
          !isSinglePost &&
          !overrides?.skipOverwriteCheck &&
          tweets.some((t) => t.content.trim().length > 50)
        ) {
          preStreamTweetsRef.current = [...tweets];
          setPendingAiStreamGenerate(true);
          setConfirmOverwrite(true);
          setIsGenerating(false);
          return;
        }

        const res = await fetchWithAuth("/api/ai/thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: runTopic,
            tone: aiTone,
            tweetCount: aiCount[0],
            language: aiLanguage,
            mode: isSinglePost ? "single" : "thread",
            ...(isSinglePost ? { lengthOption: aiLengthOption } : {}),
            ...(isSinglePost && targetAccountIds[0]
              ? { targetAccountId: targetAccountIds[0] }
              : {}),
            ...(runHook ? { hook: runHook } : {}),
          }),
        });
        if (!res.ok) {
          if (res.status === 402) {
            await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
            return;
          } else if (res.status === 429) {
            const body = (await res.json().catch(() => ({}))) as { retryAfter?: number };
            const wait = body.retryAfter ? ` Try again in ${body.retryAfter}s.` : "";
            toast.error(`Rate limit reached.${wait}`);
          }
          throw new Error("Generation failed");
        }
        if (!res.body) throw new Error("No response body");

        if (isSinglePost) {
          // Single-post mode: plain text response (unchanged)
          const genId = res.headers.get("X-Generation-Id");
          if (genId) setLastGenerationId(genId);
          const text = await res.text();
          if (!text || text.trim().length === 0) throw new Error("No content generated");

          // Phase 0: Save previous state for undo
          const previousTweets = structuredClone(tweets);

          const newTweet: TweetDraft = {
            id: tweets[0]?.id ?? Math.random().toString(36).substr(2, 9),
            content: text.trim(),
            media: tweets[0]?.media ?? [],
          };
          setTweets([newTweet]);
          setPreviewIndex(0);
          setIsAiOpen(false);
          // Phase 0: Undo toast for single post generation
          toast.success(t("toast.post_generated"), {
            action: {
              label: t("toast.undo"),
              onClick: () => {
                setTweets(previousTweets);
                toast.info(t("toasts.post_restored"));
              },
            },
            duration: 5000,
          });
          return;
        }

        // P2-F: Thread mode — stream each tweet directly into composer cards in real-time
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let streamDone = false;

        // Start with empty cards — streaming will populate them one by one
        setTweets([]);
        setPreviewIndex(0);
        setStreamingTweetCount(0);

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const jsonStr = trimmed.slice(6);
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr) as {
                done?: boolean;
                error?: string;
                index?: number;
                tweet?: string;
                generationId?: string;
              };
              if (event.error) {
                toast.error(t("toasts.generation_failed"));
                streamDone = true;
                break;
              }
              if (event.done) {
                if (event.generationId) setLastGenerationId(event.generationId);
                streamDone = true;
                break;
              }
              if (typeof event.tweet === "string" && event.tweet.length > 0) {
                // P2-F: Stream this tweet into composer immediately
                const newDraft: TweetDraft = {
                  id: Math.random().toString(36).substr(2, 9),
                  content: event.tweet,
                  media: [],
                };
                setTweets((prev) => {
                  const updated = [...prev, newDraft];
                  return aiAddNumbering ? applyNumbering(updated) : updated;
                });
                setStreamingTweetCount((c) => c + 1);
              }
            } catch {
              // partial line — skip
            }
          }
        }

        // Finalize — close panel after a brief delay so user sees the last card appear
        await new Promise((r) => setTimeout(r, 400));
        setIsAiOpen(false);
        const previousTweets = preStreamTweetsRef.current;
        preStreamTweetsRef.current = null;
        // Phase 3: Standardized toast messages
        toast.success(t("toast.ai_writer_generated"), {
          action: previousTweets
            ? {
                label: t("toast.undo"),
                onClick: () => {
                  setTweets(previousTweets);
                  toast.info(t("toasts.thread_restored"));
                },
              }
            : undefined,
          duration: 5000,
        });
        return;
      }

      // Phase 2: Template generation — uses same SSE streaming pattern as thread
      if (aiTool === "template") {
        if (!templateConfig) {
          toast.error(t("toasts.select_template_first"));
          return;
        }
        if (!aiTopic || aiTopic.trim().length < 3) {
          toast.error(t("toasts.topic_min_length"));
          return;
        }

        // Pre-check overwrite guard
        if (!overrides?.skipOverwriteCheck && tweets.some((t) => t.content.trim().length > 50)) {
          preStreamTweetsRef.current = [...tweets];
          setPendingAiStreamGenerate(true);
          setConfirmOverwrite(true);
          setIsGenerating(false);
          return;
        }

        const res = await fetchWithAuth("/api/ai/template-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: templateConfig.id,
            topic: aiTopic.trim(),
            tone: aiTone,
            language: aiLanguage,
            outputFormat: templateFormat,
          }),
        });

        if (!res.ok) {
          if (res.status === 402) {
            await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
            return;
          } else if (res.status === 429) {
            const body = (await res.json().catch(() => ({}))) as { retryAfter?: number };
            const wait = body.retryAfter ? ` Try again in ${body.retryAfter}s.` : "";
            toast.error(`Rate limit reached.${wait}`);
            return;
          }
          throw new Error("Template generation failed");
        }

        if (!res.body) throw new Error("No response body");

        // Stream tweets using same pattern as thread
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let streamDone = false;

        setTweets([]);
        setPreviewIndex(0);
        setStreamingTweetCount(0);

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const jsonStr = trimmed.slice(6);
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr) as {
                done?: boolean;
                error?: string;
                index?: number;
                tweet?: string;
                generationId?: string;
              };
              if (event.error) {
                toast.error(t("toasts.generation_failed"));
                streamDone = true;
                break;
              }
              if (event.done) {
                if (event.generationId) setLastGenerationId(event.generationId);
                streamDone = true;
                break;
              }
              if (typeof event.tweet === "string" && event.tweet.length > 0) {
                const newDraft: TweetDraft = {
                  id: Math.random().toString(36).substr(2, 9),
                  content: event.tweet,
                  media: [],
                };
                setTweets((prev) => {
                  const updated = [...prev, newDraft];
                  return aiAddNumbering ? applyNumbering(updated) : updated;
                });
                setStreamingTweetCount((c) => c + 1);
              }
            } catch {
              // partial line — skip
            }
          }
        }

        await new Promise((r) => setTimeout(r, 400));
        setIsAiOpen(false);
        const previousTweets = preStreamTweetsRef.current;
        preStreamTweetsRef.current = null;

        // Store AI meta for saving as template later
        const templateAiMeta: TemplateAiMeta = {
          templateId: templateConfig.id,
          tone: aiTone,
          language: aiLanguage,
          outputFormat: templateFormat,
        };
        setLastTemplateAiMeta(templateAiMeta);

        // Phase 3: Standardized toast messages
        toast.success(t("toast.template_generated"), {
          action: previousTweets
            ? {
                label: t("toast.undo"),
                onClick: () => {
                  setTweets(previousTweets);
                  toast.info(t("toasts.content_restored"));
                },
              }
            : undefined,
          duration: 5000,
        });
        return;
      }

      if (aiTool === "hook") {
        // Phase 0: Hook targets active tweet, not always tweet[0]
        const targetTweet = aiTargetTweetId
          ? tweets.find((t) => t.id === aiTargetTweetId)
          : tweets[0];
        if (!targetTweet) throw new Error("No tweet to update");

        // Phase 0: Overwrite guard for Hook
        if (targetTweet.content.trim().length > 50) {
          previousTweetsRef.current = structuredClone(tweets);
        }

        const res = await fetchWithAuth("/api/ai/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: "hook",
            topic: aiTopic || targetTweet.content || "",
            tone: aiTone,
            language: aiLanguage,
          }),
        });
        if (!res.ok) {
          if (res.status === 402) {
            await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
            return;
          }
          throw new Error("Hook generation failed");
        }
        const data = (await res.json()) as { text: string; generationId?: string };
        if (data.generationId) setLastGenerationId(data.generationId);
        updateTweet(targetTweet.id, data.text);
        setIsAiOpen(false);
        // Phase 3: Standardized toast messages
        toast.success(t("toast.hook_generated"), {
          action: previousTweetsRef.current
            ? {
                label: t("toast.undo"),
                onClick: () => {
                  if (previousTweetsRef.current) {
                    setTweets(previousTweetsRef.current);
                    previousTweetsRef.current = null;
                    toast.info(t("toasts.changes_undone"));
                  }
                },
              }
            : undefined,
          duration: 5000,
        });
        return;
      }

      if (aiTool === "cta") {
        // Phase 2: CTA now has access to thread context for better relevance
        const threadContext = tweets
          .map((t) => t.content)
          .filter(Boolean)
          .join(" ")
          .slice(0, 500);
        const res = await fetchWithAuth("/api/ai/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: "cta",
            tone: aiTone,
            language: aiLanguage,
            context: threadContext || undefined,
          }),
        });
        if (!res.ok) {
          if (res.status === 402) {
            await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
            return;
          }
          throw new Error("CTA generation failed");
        }
        const data = (await res.json()) as { text: string; generationId?: string };
        if (data.generationId) setLastGenerationId(data.generationId);
        const last = tweets[tweets.length - 1];
        if (!last) throw new Error("No tweet to update");
        updateTweet(last.id, `${last.content}\n\n${data.text}`.trim());
        setIsAiOpen(false);
        // Phase 3: Standardized toast messages
        toast.success(t("toast.cta_added"));
        return;
      }

      if (aiTool === "translate") {
        const nonEmptyTweets = tweets.filter((t) => t.content.trim());
        if (nonEmptyTweets.length === 0) {
          toast.error(t("toasts.add_content_to_translate"));
          return;
        }

        // Phase 0: Show confirmation dialog before translating
        if (!overrides?.skipTranslateCheck) {
          setConfirmTranslate(true);
          setIsGenerating(false);
          return;
        }

        // Phase 0: Save state for undo before translating
        previousTweetsRef.current = structuredClone(tweets);

        const res = await fetchWithAuth("/api/ai/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tweets: nonEmptyTweets.map((t) => t.content),
            targetLanguage: aiTranslateTarget,
          }),
        });
        if (!res.ok) {
          if (res.status === 402) {
            await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
            return;
          }
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Translation failed");
        }
        const data = await res.json();
        let translatedIdx = 0;
        const next = tweets.map((t) => {
          if (!t.content.trim()) return t;
          const translated = data.tweets?.[translatedIdx++];
          return translated ? { ...t, content: translated } : t;
        });
        setTweets(next);
        setIsAiOpen(false);
        // Phase 3: Standardized toast messages
        const translatedCount = nonEmptyTweets.length;
        toast.success(t("toast.translated", { count: translatedCount }), {
          action: {
            label: t("toast.undo"),
            onClick: () => {
              if (previousTweetsRef.current) {
                setTweets(previousTweetsRef.current);
                previousTweetsRef.current = null;
                toast.info(t("toasts.translation_undone"));
              }
            },
          },
          duration: 5000,
        });
        return;
      }

      if (aiTool === "hashtags") {
        const targetId = aiTargetTweetId;
        if (!targetId) throw new Error("No tweet selected");
        const targetTweet = tweets.find((x) => x.id === targetId);
        if (!targetTweet?.content.trim()) throw new Error("Tweet is empty");

        const res = await fetchWithAuth("/api/ai/hashtags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: targetTweet.content,
            language: aiLanguage,
          }),
        });
        if (!res.ok) {
          if (res.status === 402) {
            await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
            return;
          }
          throw new Error("Hashtag generation failed");
        }
        const data = await res.json();
        setGeneratedHashtags(data.hashtags || []);
        // Phase 3: Keep panel open - hashtags appear as inline chips in panel
        toast.success(t("toast.hashtags_generated", { count: data.hashtags?.length || 0 }));
        return;
      }

      // Phase 0: Rewrite branch (note: this is the "rewrite" tool, distinct from hook/cta)
      const targetId = aiTargetTweetId;
      if (!targetId) throw new Error("No tweet selected");

      // Phase 0: Save previous content for undo
      const targetTweet = tweets.find((t) => t.id === targetId);
      if (targetTweet?.content) {
        previousTweetsRef.current = structuredClone(tweets);
      }

      const res = await fetchWithAuth("/api/ai/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "rewrite",
          input: aiRewriteText,
          tone: aiTone,
          language: aiLanguage,
        }),
      });
      if (!res.ok) {
        if (res.status === 402) {
          await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
          return;
        }
        throw new Error("Rewrite failed");
      }
      const data = (await res.json()) as { text: string; generationId?: string };
      if (data.generationId) setLastGenerationId(data.generationId);
      updateTweet(targetId, data.text);
      setIsAiOpen(false);
      // Phase 3: Standardized toast messages
      toast.success(t("toast.rewrite_generated"), {
        action: {
          label: t("toast.undo"),
          onClick: () => {
            if (previousTweetsRef.current) {
              setTweets(previousTweetsRef.current);
              previousTweetsRef.current = null;
              toast.info(t("toasts.rewrite_undone"));
            }
          },
        },
        duration: 5000,
      });
    } catch (error) {
      clientLogger.error("AI request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error(error instanceof Error ? error.message : "AI request failed");
    } finally {
      setIsGenerating(false);
      setAiHook("");
    }
  };

  return {
    isAiOpen,
    setIsAiOpen,
    isGenerating,
    setIsGenerating,
    aiTool,
    setAiTool,
    aiTargetTweetId,
    setAiTargetTweetId,
    aiTopic,
    setAiTopic,
    aiHook,
    setAiHook,
    inspirationTopics,
    setInspirationTopics,
    inspirationNiche,
    setInspirationNiche,
    isLoadingInspiration,
    setIsLoadingInspiration,
    templateConfig,
    setTemplateConfig,
    templatesDialogOpen,
    setTemplatesDialogOpen,
    templateFormat,
    setTemplateFormat,
    generatedHashtags,
    setGeneratedHashtags,
    aiTone,
    setAiTone,
    aiCount,
    setAiCount,
    aiLanguage,
    setAiLanguage,
    aiLengthOption,
    setAiLengthOption,
    aiRewriteText,
    setAiRewriteText,
    lastGenerationId,
    setLastGenerationId,
    userPlan,
    setUserPlan,
    aiAddNumbering,
    setAiAddNumbering,
    aiTranslateTarget,
    setAiTranslateTarget,
    lastTemplateAiMeta,
    setLastTemplateAiMeta,
    confirmOverwrite,
    setConfirmOverwrite,
    pendingTweets,
    setPendingTweets,
    streamingTweetCount,
    setStreamingTweetCount,
    pendingAiStreamGenerate,
    setPendingAiStreamGenerate,
    confirmTranslate,
    setConfirmTranslate,
    preStreamTweetsRef,
    previousTweetsRef,
    openAiTool,
    handleFetchInspiration,
    handleInspirationSelect,
    handleTemplateConfigSelect,
    restoreHistory,
    handleTemplateSelect,
    handleAiRun,
  };
}
