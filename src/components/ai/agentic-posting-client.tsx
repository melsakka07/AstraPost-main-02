"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { AccountInfo } from "@/components/ai/agentic/input-screen";
import { InputScreen } from "@/components/ai/agentic/input-screen";
import {
  ProcessingScreen,
  ORDERED_STEPS,
  type StepProgress,
} from "@/components/ai/agentic/processing-screen";
import { ReviewScreen } from "@/components/ai/agentic/review-screen";
import type { StepState } from "@/components/ai/agentic/step-icon";
import { SuccessScreen } from "@/components/ai/agentic/success-screen";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import type {
  AgenticPost,
  AgenticTweet,
  PipelineProgressEvent,
  PipelineStep,
} from "@/lib/ai/agentic-types";
import { sendToComposer } from "@/lib/composer-bridge";
import { parsePlanLimitResponse } from "@/lib/types/plan-limit";

// ── Main component ────────────────────────────────────────────────────────────

interface AgenticPostingClientProps {
  xAccounts: AccountInfo[];
  hasVoiceProfile: boolean;
  isLocked?: boolean;
  userPlan?: string | null;
}

export function AgenticPostingClient({
  xAccounts,
  hasVoiceProfile,
  isLocked = false,
  userPlan,
}: AgenticPostingClientProps) {
  const t = useTranslations("ai_agentic");
  const { openWithContext } = useUpgradeModal();
  const [screen, setScreen] = useState<"input" | "processing" | "review">("input");

  // ── Input screen state ──
  const [topic, setTopic] = useState("");
  // ── Broad topic suggestions state ──
  const [broadSuggestions, setBroadSuggestions] = useState<string[]>([]);
  const [broadMessage, setBroadMessage] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(xAccounts[0]?.id ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tone, setTone] = useState("auto");
  const [language, setLanguage] = useState("en");
  const [includeImages, setIncludeImages] = useState(true);
  const [audience, setAudience] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const enhanceAbortRef = useRef<AbortController | null>(null);

  // ── Processing screen state ──
  const [steps, setSteps] = useState<Record<PipelineStep, StepProgress>>(
    () =>
      Object.fromEntries(
        ORDERED_STEPS.map((s) => [s, { state: "pending" as StepState }])
      ) as Record<PipelineStep, StepProgress>
  );
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const agenticPostIdRef = useRef<string | null>(null);
  const isBackgroundedRef = useRef(false);

  // ── Review screen state ──
  const [agenticPost, setAgenticPost] = useState<AgenticPost | null>(null);
  const [editedTweets, setEditedTweets] = useState<AgenticTweet[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [rewritingIndex, setRewritingIndex] = useState<number | null>(null);
  const [showResearch, setShowResearch] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successAction, setSuccessAction] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const selectedAccount = xAccounts.find((a) => a.id === selectedAccountId) ?? xAccounts[0];

  // ── Progress event handler (defined before startPipeline so it can be listed as dep) ──
  const handleProgressEvent = useCallback(
    (event: PipelineProgressEvent) => {
      const { step, status, data } = event;

      if (status === "needs_input") {
        // Pipeline paused — topic is too broad. Show suggestions overlay on processing screen.
        const d = data as { suggestions?: string[]; message?: string };
        setBroadSuggestions(d.suggestions ?? []);
        setBroadMessage(d.message ?? t("processing_screen.broad_topic_title"));
        return;
      }

      if (step === "done") {
        if (status === "failed") {
          const errMsg = (data as { error?: string })?.error ?? t("toasts.generation_failed");
          if (isBackgroundedRef.current) {
            toast.error(errMsg);
          } else {
            toast.error(errMsg);
            setScreen("input");
          }
          return;
        }
        const post = data as AgenticPost;
        agenticPostIdRef.current = post.id;
        if (isBackgroundedRef.current) {
          setAgenticPost(post);
          setEditedTweets([...post.tweets]);
          toast.success(t("toasts.pipeline_ready", { topic: post.topic }), {
            duration: 8000,
            action: { label: t("review_screen.ready"), onClick: () => setScreen("review") },
          });
          return;
        }
        setAgenticPost(post);
        setEditedTweets([...post.tweets]);
        setScreen("review");
        return;
      }

      setSteps((prev) => {
        const next = { ...prev };
        const stepKey = step as PipelineStep;

        if (status === "in_progress") {
          next[stepKey] = { state: "in_progress", startedAt: Date.now() };
        } else if (status === "complete") {
          const elapsed = prev[stepKey]?.startedAt
            ? Date.now() - (prev[stepKey].startedAt ?? 0)
            : undefined;
          let summary: string | undefined;

          if (step === "research" && data) {
            const d = data as { recommendedAngle?: string; angles?: unknown[] };
            summary =
              d.recommendedAngle ??
              t("processing_screen.angles_found", { count: (d.angles as unknown[])?.length ?? 0 });
          } else if (step === "strategy" && data) {
            const d = data as { format?: string; tweetCount?: number };
            summary = t("processing_screen.format", {
              format:
                d.format === "thread"
                  ? t("processing_screen.format_thread")
                  : t("processing_screen.format_single"),
              count: d.tweetCount ?? 1,
            });
          } else if (step === "review" && data) {
            const d = data as { qualityScore?: number };
            summary = d.qualityScore
              ? t("processing_screen.quality_score", { score: d.qualityScore })
              : undefined;
          }

          next[stepKey] = { state: "complete", elapsedMs: elapsed, summary };
        } else if (status === "progress" && step === "images") {
          const d = event as { completed?: number; total?: number };
          next[stepKey] = {
            ...prev[stepKey],
            state: "in_progress",
            summary: t("processing_screen.images_progress", {
              completed: d.completed ?? 0,
              total: d.total ?? 0,
            }),
          };
        } else if (status === "failed") {
          next[stepKey] = { state: "failed", summary: t("processing_screen.step_failed") };
        }

        return next;
      });
    },
    [t]
  );

  // ── Submit pipeline ────────────────────────────────────────────────────────
  const startPipeline = useCallback(
    async (topicOverride?: string) => {
      const trimmed = (topicOverride ?? topic).trim();
      if (trimmed.length < 3 || !selectedAccountId) return;

      // Reset processing state
      isBackgroundedRef.current = false;
      setSteps(
        Object.fromEntries(
          ORDERED_STEPS.map((s) => [s, { state: "pending" as StepState }])
        ) as Record<PipelineStep, StepProgress>
      );
      setShowCancelConfirm(false);
      setScreen("processing");

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const res = await fetch("/api/ai/agentic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: trimmed,
            xAccountId: selectedAccountId,
            language,
            preferences: {
              ...(tone !== "auto" && { tone }),
              includeImages,
              ...(audience.trim() && { audience: audience.trim() }),
            },
          }),
          signal: abort.signal,
        });

        if (res.status === 402) {
          const payload = await parsePlanLimitResponse(res);
          openWithContext({
            error: payload?.error,
            code: payload?.code,
            message: payload?.message,
            feature: payload?.feature,
            plan: payload?.plan,
            limit: payload?.limit,
            used: payload?.used,
            remaining: payload?.remaining,
            upgradeUrl: payload?.upgrade_url,
            suggestedPlan: payload?.suggested_plan,
            trialActive: payload?.trial_active,
            resetAt: payload?.reset_at,
          });
          setScreen("input");
          return;
        }

        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ error: t("toasts.request_failed") }));
          toast.error((err as { error?: string }).error ?? t("toasts.pipeline_start_failed"));
          setScreen("input");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6)) as PipelineProgressEvent;
              handleProgressEvent(event);
            } catch {
              /* skip malformed */
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        toast.error(t("toasts.pipeline_failed"));
        setScreen("input");
      }
    },
    [
      topic,
      selectedAccountId,
      language,
      tone,
      includeImages,
      audience,
      handleProgressEvent,
      openWithContext,
      t,
    ]
  );

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setScreen("input");
    setShowCancelConfirm(false);
  }, []);

  const handleBackground = useCallback(() => {
    isBackgroundedRef.current = true;
    setScreen("input");
    setShowCancelConfirm(false);
    toast.info(t("toasts.background_started"), { duration: 5000 });
  }, [t]);

  // ── Enhance topic ──────────────────────────────────────────────────────────
  const handleEnhanceTopic = useCallback(async () => {
    const trimmed = topic.trim();
    if (trimmed.length < 3) return;

    enhanceAbortRef.current?.abort();
    const abort = new AbortController();
    enhanceAbortRef.current = abort;
    setIsEnhancing(true);

    try {
      const res = await fetch("/api/ai/enhance-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: t("toasts.enhancement_failed") }));
        toast.error((err as { error?: string }).error ?? t("toasts.enhancement_failed"));
        return;
      }

      const { enhanced } = (await res.json()) as { enhanced: string };
      setTopic(enhanced);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      toast.error(t("toasts.enhancement_failed"));
    } finally {
      setIsEnhancing(false);
    }
  }, [topic, t]);

  // ── Recovery on mount — check for in-progress sessions ───────────────────
  useEffect(() => {
    async function checkRecovery() {
      try {
        const res = await fetch("/api/ai/agentic");
        if (!res.ok) return;
        const { session } = (await res.json()) as {
          session: {
            id: string;
            status: string;
            topic: string;
            tweets: unknown;
            researchBrief: unknown;
            contentPlan: unknown;
            qualityScore: number | null;
            summary: string | null;
          } | null;
        };
        if (!session) return;

        if (session.status === "ready" && session.tweets) {
          agenticPostIdRef.current = session.id;
          const reconstructed = {
            id: session.id,
            topic: session.topic,
            research: session.researchBrief,
            plan: session.contentPlan,
            tweets: session.tweets as AgenticTweet[],
            qualityScore: session.qualityScore ?? 7,
            summary: session.summary ?? session.topic,
            createdAt: new Date().toISOString(),
            xAccountId: "",
            xSubscriptionTier: "None" as const,
          };
          setAgenticPost(reconstructed as AgenticPost);
          setEditedTweets(reconstructed.tweets);
          setTopic(session.topic);
          toast.info(t("toasts.session_resumed"), { duration: 3000 });
          setScreen("review");
        } else if (session.status === "generating") {
          toast.info(t("toasts.session_in_progress", { topic: session.topic }), {
            duration: 5000,
            action: { label: t("toasts.refresh"), onClick: () => window.location.reload() },
          });
        }
      } catch {
        /* silent — recovery is best-effort */
      }
    }
    void checkRecovery();
  }, [t]);

  // ── Review actions ─────────────────────────────────────────────────────────
  const handleApprove = useCallback(
    async (action: "post_now" | "schedule" | "save_draft") => {
      if (!agenticPostIdRef.current || editedTweets.length === 0) return;
      if (action === "schedule" && !scheduleDate) {
        setShowSchedulePicker(true);
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/ai/agentic/${agenticPostIdRef.current}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            ...(action === "schedule" &&
              scheduleDate && {
                scheduledAt: new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString(),
              }),
            tweets: editedTweets,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(
            (err as { error?: string }).error ??
              (err as { message?: string }).message ??
              t("toasts.approve_post_failed")
          );
          return;
        }

        const labels: Record<string, string> = {
          post_now: t("review_screen.post_queued"),
          schedule: t("review_screen.scheduled_for", { date: scheduleDate || "—" }),
          save_draft: t("review_screen.draft_saved"),
        };
        toast.success(labels[action] ?? t("toasts.done"));
        setSuccessAction(action);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editedTweets, scheduleDate, scheduleTime, t]
  );

  const handleRewriteTweet = useCallback(
    async (idx: number) => {
      if (!agenticPostIdRef.current) return;
      setRewritingIndex(idx);
      try {
        const res = await fetch(`/api/ai/agentic/${agenticPostIdRef.current}/regenerate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tweetIndex: idx, regenerateImage: false }),
        });
        if (!res.ok) {
          toast.error(t("toasts.rewrite_failed"));
          return;
        }
        const { tweet } = (await res.json()) as { tweet: AgenticTweet };
        setEditedTweets((prev) => {
          const next = [...prev];
          next[idx] = tweet;
          return next;
        });
      } finally {
        setRewritingIndex(null);
      }
    },
    [t]
  );

  const handleRemoveTweet = useCallback(
    (idx: number) => {
      const removed = editedTweets[idx];
      if (!removed) return;
      setEditedTweets((prev) => prev.filter((_, i) => i !== idx));
      const timer = setTimeout(() => {
        /* auto-dismiss */
      }, 5000);
      toast(t("toasts.tweet_removed"), {
        action: {
          label: t("toasts.undo"),
          onClick: () => {
            clearTimeout(timer);
            setEditedTweets((prev) => {
              const next = [...prev];
              next.splice(idx, 0, removed);
              return next;
            });
          },
        },
      });
    },
    [editedTweets, t]
  );

  const handleSaveEdit = useCallback(
    (idx: number) => {
      setEditedTweets((prev) => {
        const next = [...prev];
        const existing = next[idx];
        if (!existing) return next;
        next[idx] = { ...existing, text: editText, charCount: editText.length };
        return next;
      });
      setEditingIndex(null);
      setEditText("");
    },
    [editText]
  );

  const handleAddTweet = useCallback(
    (afterIndex?: number) => {
      const insertAt = afterIndex !== undefined ? afterIndex + 1 : editedTweets.length;
      setEditedTweets((prev) => {
        const newTweet: AgenticTweet = {
          position: insertAt,
          text: "",
          hashtags: [],
          hasImage: false,
          charCount: 0,
        };
        const next = [...prev];
        next.splice(insertAt, 0, newTweet);
        return next.map((t, i) => ({ ...t, position: i }));
      });
      setEditingIndex(insertAt);
      setEditText("");
    },
    [editedTweets.length]
  );

  const handleReorder = useCallback((activeId: string, overId: string) => {
    setEditedTweets((prev) => {
      const oldIndex = prev.findIndex((_, i) => String(i) === activeId);
      const newIndex = prev.findIndex((_, i) => String(i) === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
      return arrayMove(prev, oldIndex, newIndex).map((t, i) => ({ ...t, position: i }));
    });
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (screen === "input")
    return (
      <InputScreen
        topic={topic}
        setTopic={setTopic}
        onSubmit={startPipeline}
        onSelectTrend={setTopic}
        selectedAccount={selectedAccount}
        accounts={xAccounts}
        selectedAccountId={selectedAccountId}
        setSelectedAccountId={setSelectedAccountId}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        tone={tone}
        setTone={setTone}
        language={language}
        setLanguage={setLanguage}
        includeImages={includeImages}
        setIncludeImages={setIncludeImages}
        audience={audience}
        setAudience={setAudience}
        isEnhancing={isEnhancing}
        onEnhanceTopic={handleEnhanceTopic}
        hasVoiceProfile={hasVoiceProfile}
        isLocked={isLocked}
      />
    );

  if (screen === "processing")
    return (
      <ProcessingScreen
        topic={topic}
        steps={steps}
        showCancelConfirm={showCancelConfirm}
        setShowCancelConfirm={setShowCancelConfirm}
        onCancel={handleCancel}
        onBackground={handleBackground}
        broadSuggestions={broadSuggestions}
        broadMessage={broadMessage}
        onSelectSuggestion={(s: string) => {
          setBroadSuggestions([]);
          void startPipeline(s);
        }}
      />
    );

  // review screen
  if (successAction)
    return (
      <SuccessScreen
        action={successAction}
        {...(scheduleDate ? { scheduleDate } : {})}
        tweets={editedTweets}
        onCreateAnother={() => {
          setSuccessAction(null);
          setScreen("input");
          setTopic("");
        }}
      />
    );

  const doChangeTopic = async () => {
    await fetch("/api/ai/agentic", { method: "DELETE" }).catch(() => void 0);
    setScreen("input");
  };

  return (
    <>
      <ReviewScreen
        agenticPost={agenticPost}
        editedTweets={editedTweets}
        editingIndex={editingIndex}
        editText={editText}
        setEditText={setEditText}
        rewritingIndex={rewritingIndex}
        showResearch={showResearch}
        setShowResearch={setShowResearch}
        scheduleDate={scheduleDate}
        setScheduleDate={setScheduleDate}
        scheduleTime={scheduleTime}
        setScheduleTime={setScheduleTime}
        showSchedulePicker={showSchedulePicker}
        setShowSchedulePicker={setShowSchedulePicker}
        isSubmitting={isSubmitting}
        selectedAccount={selectedAccount}
        {...(userPlan !== undefined && { userPlan })}
        onEditStart={(idx) => {
          setEditingIndex(idx);
          setEditText(editedTweets[idx]?.text ?? "");
        }}
        onEditSave={handleSaveEdit}
        onEditCancel={() => {
          setEditingIndex(null);
          setEditText("");
        }}
        onRewrite={handleRewriteTweet}
        onRemove={handleRemoveTweet}
        onAddTweet={handleAddTweet}
        onApprove={handleApprove}
        onReorder={handleReorder}
        onChangeTopic={doChangeTopic}
        onRegenerateAll={() => setShowRegenerateConfirm(true)}
        onDiscard={() => setShowDiscardConfirm(true)}
        onSendToComposer={() =>
          sendToComposer(
            editedTweets.map((tw) => tw.text),
            { source: "agentic" }
          )
        }
      />

      {/* Regenerate confirmation */}
      <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.regenerate_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dialogs.regenerate_description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialogs.keep_editing")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowRegenerateConfirm(false);
                setScreen("input");
                void startPipeline(topic);
              }}
            >
              {t("dialogs.regenerate_button")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard confirmation */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.discard_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dialogs.discard_description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialogs.cancel_button")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowDiscardConfirm(false);
                void doChangeTopic();
              }}
            >
              {t("dialogs.discard_button")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
