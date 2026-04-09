"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Wand2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Circle,
  XCircle,
  RefreshCw,
  ImageIcon,
  Pencil,
  X,
  Plus,
  Calendar,
  Send,
  BookmarkIcon,
  Trash2,
  ArrowLeft,
  ListOrdered,
  GripVertical,
  Eraser,
} from "lucide-react";
import { toast } from "sonner";
import type { XAccountOption } from "@/app/dashboard/ai/agentic/page";
import { AgenticTrendsPanel } from "@/components/ai/agentic-trends-panel";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { XSubscriptionBadge } from "@/components/ui/x-subscription-badge";
import type {
  AgenticPost,
  AgenticTweet,
  PipelineProgressEvent,
  PipelineStep,
} from "@/lib/ai/agentic-types";
import { LANGUAGES, TONE_ENUM } from "@/lib/constants";

// ── Suggestion chips ──────────────────────────────────────────────────────────
const DEFAULT_SUGGESTIONS = [
  "AI coding tools",
  "Startup funding tips",
  "Content creation in 2026",
  "MENA tech scene",
  "Remote work productivity",
];

// ── Step metadata ─────────────────────────────────────────────────────────────
const STEP_CONFIG: Record<PipelineStep, { label: string; estimatedMs: number }> = {
  research: { label: "Research", estimatedMs: 4000 },
  strategy: { label: "Strategy", estimatedMs: 3000 },
  writing: { label: "Writing", estimatedMs: 7000 },
  images: { label: "Images", estimatedMs: 20000 },
  review: { label: "Final Review", estimatedMs: 3000 },
  done: { label: "Done", estimatedMs: 0 },
};

const ORDERED_STEPS: PipelineStep[] = ["research", "strategy", "writing", "images", "review"];

type StepState = "pending" | "in_progress" | "complete" | "failed";

interface StepProgress {
  state: StepState;
  summary?: string | undefined;
  elapsedMs?: number | undefined;
  startedAt?: number | undefined;
}

// ── Main component ────────────────────────────────────────────────────────────

interface AgenticPostingClientProps {
  xAccounts: XAccountOption[];
  hasVoiceProfile: boolean;
}

export function AgenticPostingClient({ xAccounts }: AgenticPostingClientProps) {
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

  // ── Review screen state ──
  const [agenticPost, setAgenticPost] = useState<AgenticPost | null>(null);
  const [editedTweets, setEditedTweets] = useState<AgenticTweet[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [rewritingIndex, setRewritingIndex] = useState<number | null>(null);
  const [showResearch, setShowResearch] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successAction, setSuccessAction] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const selectedAccount = xAccounts.find((a) => a.id === selectedAccountId) ?? xAccounts[0];

  // ── Progress event handler (defined before startPipeline so it can be listed as dep) ──
  const handleProgressEvent = useCallback((event: PipelineProgressEvent) => {
    const { step, status, data } = event;

    if (status === "needs_input") {
      // Pipeline paused — topic is too broad. Show suggestions overlay on processing screen.
      const d = data as { suggestions?: string[]; message?: string };
      setBroadSuggestions(d.suggestions ?? []);
      setBroadMessage(d.message ?? "Your topic is broad. Pick a specific angle:");
      return;
    }

    if (step === "done") {
      if (status === "failed") {
        toast.error((data as { error?: string })?.error ?? "Generation failed");
        setScreen("input");
        return;
      }
      const post = data as AgenticPost;
      agenticPostIdRef.current = post.id;
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
          summary = d.recommendedAngle ?? `${(d.angles as unknown[])?.length ?? 0} angles found`;
        } else if (step === "strategy" && data) {
          const d = data as { format?: string; tweetCount?: number };
          summary = `${d.format === "thread" ? `Thread · ${d.tweetCount} tweets` : "Single post"}`;
        } else if (step === "review" && data) {
          const d = data as { qualityScore?: number };
          summary = d.qualityScore ? `Quality score: ${d.qualityScore}/10` : undefined;
        }

        next[stepKey] = { state: "complete", elapsedMs: elapsed, summary };
      } else if (status === "progress" && step === "images") {
        const d = event as { completed?: number; total?: number };
        next[stepKey] = {
          ...prev[stepKey],
          state: "in_progress",
          summary: `${d.completed ?? 0} of ${d.total ?? 0} generated`,
        };
      } else if (status === "failed") {
        next[stepKey] = { state: "failed", summary: "Step failed" };
      }

      return next;
    });
  }, []);

  // ── Submit pipeline ────────────────────────────────────────────────────────
  const startPipeline = useCallback(
    async (topicOverride?: string) => {
      const t = (topicOverride ?? topic).trim();
      if (t.length < 3 || !selectedAccountId) return;

      // Reset processing state
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
            topic: t,
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
          const err = await res.json().catch(() => ({}));
          const resetAt = (err as { reset_at?: string }).reset_at;
          const msg = resetAt
            ? `AI quota reached. Resets on ${new Date(resetAt).toLocaleDateString()}. Upgrade for unlimited access.`
            : "AI quota reached. Upgrade your plan to continue.";
          toast.error(msg, { duration: 8000 });
          setScreen("input");
          return;
        }

        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          toast.error((err as { error?: string }).error ?? "Failed to start pipeline");
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
        toast.error("Pipeline failed. Please try again.");
        setScreen("input");
      }
    },
    [topic, selectedAccountId, language, tone, includeImages, audience, handleProgressEvent]
  );

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setScreen("input");
    setShowCancelConfirm(false);
  }, []);

  // ── Enhance topic ──────────────────────────────────────────────────────────
  const handleEnhanceTopic = useCallback(async () => {
    const t = topic.trim();
    if (t.length < 3) return;

    enhanceAbortRef.current?.abort();
    const abort = new AbortController();
    enhanceAbortRef.current = abort;
    setIsEnhancing(true);

    try {
      const res = await fetch("/api/ai/enhance-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Enhancement failed" }));
        toast.error((err as { error?: string }).error ?? "Enhancement failed");
        return;
      }

      const { enhanced } = (await res.json()) as { enhanced: string };
      setTopic(enhanced);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      toast.error("Enhancement failed. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  }, [topic]);

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
          // Resume on review screen
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
          toast.info("Resumed your previous session.", { duration: 3000 });
          setScreen("review");
        } else if (session.status === "generating") {
          // Show a non-blocking toast — session is still running server-side
          toast.info(`A generation is in progress for "${session.topic}". It may have completed.`, {
            duration: 5000,
            action: { label: "Refresh", onClick: () => window.location.reload() },
          });
        }
      } catch {
        /* silent — recovery is best-effort */
      }
    }
    void checkRecovery();
  }, []); // empty deps — run once on mount

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
              scheduleDate && { scheduledAt: new Date(scheduleDate + "T09:00:00Z").toISOString() }),
            tweets: editedTweets,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(
            (err as { error?: string }).error ??
              (err as { message?: string }).message ??
              "Failed to approve post"
          );
          return;
        }

        const labels: Record<string, string> = {
          post_now: "Thread queued for posting! 🎉",
          schedule: `Scheduled for ${scheduleDate || "later"}`,
          save_draft: "Saved as draft. Open in Compose anytime.",
        };
        toast.success(labels[action] ?? "Done!");
        setSuccessAction(action);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editedTweets, scheduleDate]
  );

  const handleRewriteTweet = useCallback(async (idx: number) => {
    if (!agenticPostIdRef.current) return;
    setRewritingIndex(idx);
    try {
      const res = await fetch(`/api/ai/agentic/${agenticPostIdRef.current}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetIndex: idx, regenerateImage: false }),
      });
      if (!res.ok) {
        toast.error("Rewrite failed");
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
  }, []);

  const handleRemoveTweet = useCallback(
    (idx: number) => {
      const removed = editedTweets[idx];
      if (!removed) return;
      setEditedTweets((prev) => prev.filter((_, i) => i !== idx));
      const timer = setTimeout(() => {
        /* auto-dismiss */
      }, 5000);
      toast("Tweet removed", {
        action: {
          label: "Undo",
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
    [editedTweets]
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

  const handleAddTweet = useCallback(() => {
    setEditedTweets((prev) => [
      ...prev,
      {
        position: prev.length,
        text: "",
        hashtags: [],
        hasImage: false,
        charCount: 0,
      },
    ]);
    setEditingIndex(editedTweets.length);
    setEditText("");
  }, [editedTweets.length]);

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
        onSelectTrend={(t) => {
          setTopic(t);
        }}
        selectedAccount={selectedAccount}
        xAccounts={xAccounts}
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
        showSchedulePicker={showSchedulePicker}
        setShowSchedulePicker={setShowSchedulePicker}
        isSubmitting={isSubmitting}
        selectedAccount={selectedAccount}
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
      />

      {/* Regenerate confirmation */}
      <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate entire thread?</AlertDialogTitle>
            <AlertDialogDescription>
              All your edits will be lost. The AI will rewrite the thread from scratch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowRegenerateConfirm(false);
                setScreen("input");
                void startPipeline(topic);
              }}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard confirmation */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this thread?</AlertDialogTitle>
            <AlertDialogDescription>
              This thread will be deleted and you&apos;ll return to the input screen. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowDiscardConfirm(false);
                void doChangeTopic();
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 1 — INPUT
// ══════════════════════════════════════════════════════════════════════════════

interface InputScreenProps {
  topic: string;
  setTopic: (v: string) => void;
  onSubmit: (topicOverride?: string) => void;
  onSelectTrend: (topic: string) => void;
  selectedAccount: XAccountOption | undefined;
  xAccounts: XAccountOption[];
  selectedAccountId: string;
  setSelectedAccountId: (v: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  tone: string;
  setTone: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  includeImages: boolean;
  setIncludeImages: (v: boolean) => void;
  audience: string;
  setAudience: (v: string) => void;
  isEnhancing: boolean;
  onEnhanceTopic: () => void;
}

function InputScreen({
  topic,
  setTopic,
  onSubmit,
  onSelectTrend,
  selectedAccount,
  xAccounts,
  selectedAccountId,
  setSelectedAccountId,
  showAdvanced,
  setShowAdvanced,
  tone,
  setTone,
  language,
  setLanguage,
  includeImages,
  setIncludeImages,
  audience,
  setAudience,
  isEnhancing,
  onEnhanceTopic,
}: InputScreenProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canSubmit = topic.trim().length >= 3 && !!selectedAccountId;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && canSubmit) onSubmit();
  };

  return (
    <div className="animate-in fade-in mx-auto w-full max-w-2xl space-y-6 py-8 duration-300">
      {/* ── Hero headline ──────────────────────────────────────────────────── */}
      <div className="text-center">
        <div className="mb-4 flex items-center justify-center">
          <div className="from-primary/20 to-primary/5 border-primary/10 flex h-12 w-12 items-center justify-center rounded-2xl border bg-gradient-to-br">
            <Wand2 className="text-primary h-6 w-6" />
          </div>
        </div>
        <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
          What should we post about?
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-center text-base">
          AI will research, write, and create visuals — ready in seconds.
        </p>
      </div>

      {/* ── Topic input ────────────────────────────────────────────────────── */}
      <div className="mt-8 sm:mt-10">
        <textarea
          ref={inputRef}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., AI coding tools, sustainable fashion, Web3 gaming..."
          className="border-input bg-background placeholder:text-muted-foreground/60 focus:ring-ring max-h-[10rem] min-h-[3.5rem] w-full resize-none overflow-y-auto rounded-xl border px-5 py-4 text-[15px] leading-relaxed shadow-sm transition-shadow duration-200 outline-none focus:border-transparent focus:shadow-md focus:ring-2 sm:max-h-[12rem]"
          maxLength={500}
          rows={1}
          aria-label="Topic for your post"
        />
      </div>

      {/* ── Suggestion chips ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {DEFAULT_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setTopic(s);
            }}
            className="border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm transition-colors duration-150 select-none"
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Generate button ────────────────────────────────────────────────── */}
      <div className="mt-6 flex justify-center gap-3">
        <Button
          variant="outline"
          className="h-12 gap-2 rounded-xl px-6 text-base font-medium transition-transform active:scale-[0.98]"
          disabled={!topic.trim()}
          onClick={() => setTopic("")}
          aria-label="Clear topic"
        >
          <Eraser className="h-4 w-4" />
          Clear
        </Button>
        <Button
          variant="secondary"
          className="h-12 gap-2 rounded-xl px-6 text-base font-medium transition-transform active:scale-[0.98]"
          disabled={!topic.trim() || isEnhancing}
          onClick={() => void onEnhanceTopic()}
          aria-label="Enhance topic with AI"
        >
          <Wand2 className={`h-4 w-4 ${isEnhancing ? "animate-spin" : ""}`} />
          {isEnhancing ? "Enhancing\u2026" : "Enhance"}
        </Button>
        <Button
          className="h-12 gap-2 rounded-xl px-8 text-base font-medium transition-transform active:scale-[0.98]"
          disabled={!canSubmit || isEnhancing}
          onClick={() => onSubmit()}
          aria-label={`Generate AI post about ${topic || "your topic"}`}
        >
          <Sparkles className="h-5 w-5" />
          Generate
        </Button>
      </div>

      {/* ── Trending topics ────────────────────────────────────────────────── */}
      <AgenticTrendsPanel onSelectTrend={onSelectTrend} />

      {/* ── Advanced options ───────────────────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-muted-foreground hover:text-foreground mx-auto flex items-center gap-1.5 text-sm transition-colors"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
          />
          Advanced options
        </button>

        {showAdvanced && (
          <div className="border-border bg-muted/30 animate-in fade-in slide-in-from-top-1 mt-4 space-y-4 rounded-xl border p-5 duration-200">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Tone */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="agentic-tone"
                  className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
                >
                  Tone
                </Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger id="agentic-tone" className="h-9 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (AI decides)</SelectItem>
                    {TONE_ENUM.options.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="agentic-language"
                  className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
                >
                  Language
                </Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="agentic-language" className="h-9 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Include images */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Include AI Images</p>
                <p className="text-muted-foreground text-xs">Generate visuals for key tweets</p>
              </div>
              <Switch
                id="agentic-images"
                checked={includeImages}
                onCheckedChange={setIncludeImages}
              />
            </div>

            {/* Audience hint */}
            <div className="space-y-1.5">
              <Label
                htmlFor="agentic-audience"
                className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
              >
                Audience hint <span className="normal-case">(optional)</span>
              </Label>
              <Input
                id="agentic-audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g., developers, marketers, students"
                maxLength={100}
                className="rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Account selector (bottom — secondary context) ──────────────────── */}
      {xAccounts.length > 0 && (
        <div className="mt-8 flex justify-center pb-4">
          {xAccounts.length === 1 ? (
            <div className="border-border bg-muted/30 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedAccount?.profileImageUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {selectedAccount?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>Posting as</span>
              <span className="text-foreground font-medium">@{selectedAccount?.username}</span>
              <XSubscriptionBadge tier={selectedAccount?.subscriptionTier ?? "None"} size="sm" />
            </div>
          ) : (
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="border-border bg-muted/30 text-muted-foreground hover:bg-accent inline-flex h-auto w-auto gap-2 rounded-full border px-4 py-2 text-sm transition-colors">
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={selectedAccount?.profileImageUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {selectedAccount?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>Posting as</span>
                  <span className="text-foreground font-medium">@{selectedAccount?.username}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {xAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={acc.profileImageUrl ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {acc.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>@{acc.username}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 2 — PROCESSING
// ══════════════════════════════════════════════════════════════════════════════

interface ProcessingScreenProps {
  topic: string;
  steps: Record<PipelineStep, StepProgress>;
  showCancelConfirm: boolean;
  setShowCancelConfirm: (v: boolean) => void;
  onCancel: () => void;
  broadSuggestions: string[];
  broadMessage: string;
  onSelectSuggestion: (s: string) => void;
}

function ProcessingScreen({
  topic,
  steps,
  showCancelConfirm,
  setShowCancelConfirm,
  onCancel,
  broadSuggestions,
  broadMessage,
  onSelectSuggestion,
}: ProcessingScreenProps) {
  const totalEstimated = ORDERED_STEPS.reduce((acc, s) => acc + STEP_CONFIG[s].estimatedMs, 0);
  const completedMs = ORDERED_STEPS.reduce((acc, s) => {
    if (steps[s].state === "complete") return acc + STEP_CONFIG[s].estimatedMs;
    return acc;
  }, 0);
  const remainingSecs = Math.round((totalEstimated - completedMs) / 1000);

  return (
    <div className="animate-in fade-in mx-auto max-w-xl space-y-6 py-8 duration-300 md:max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="min-w-0">
          <p className="text-muted-foreground mb-1 text-xs tracking-wide uppercase">
            Generating for topic
          </p>
          <p className="truncate font-medium">{topic}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive ml-4 shrink-0"
          onClick={() => setShowCancelConfirm(true)}
        >
          Cancel
        </Button>
      </div>

      {/* Cancel confirm */}
      {showCancelConfirm && (
        <div className="border-destructive/30 bg-destructive/5 flex items-center justify-between gap-4 rounded-lg border p-4">
          <p className="text-sm">Stop generating? Progress will be lost.</p>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowCancelConfirm(false)}>
              Keep going
            </Button>
            <Button size="sm" variant="destructive" onClick={onCancel}>
              Stop
            </Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-1" role="status" aria-live="polite">
        {ORDERED_STEPS.map((stepKey, i) => {
          const step = steps[stepKey];
          const config = STEP_CONFIG[stepKey];
          const isLast = i === ORDERED_STEPS.length - 1;

          return (
            <div key={stepKey} className="flex gap-3" aria-label={`${config.label}: ${step.state}`}>
              {/* Icon column */}
              <div className="flex flex-col items-center">
                <StepIcon state={step.state} />
                {!isLast && (
                  <div
                    className={`my-1 w-px flex-1 ${step.state === "complete" ? "bg-green-500/40" : "bg-border"}`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${step.state === "pending" ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {config.label}
                  </span>
                  {step.state === "complete" && step.elapsedMs && (
                    <span className="text-muted-foreground text-xs">
                      {(step.elapsedMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  {step.state === "in_progress" && (
                    <span className="text-primary animate-pulse text-xs">Working…</span>
                  )}
                </div>
                {step.summary && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">{step.summary}</p>
                )}
                {step.state === "in_progress" && (
                  <div className="bg-muted mt-2 h-1 w-48 overflow-hidden rounded-full">
                    <div className="bg-primary/60 h-full w-1/3 animate-[width_3s_ease-in-out_infinite] rounded-full" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Estimated time */}
      {remainingSecs > 0 && (
        <p className="text-muted-foreground text-center text-xs">~{remainingSecs}s remaining</p>
      )}

      {/* Broad topic suggestions overlay */}
      {broadSuggestions.length > 0 && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <p className="text-sm font-medium">{broadMessage}</p>
          <div className="flex flex-wrap gap-2">
            {broadSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSelectSuggestion(s)}
                className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-sm transition-colors hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepIcon({ state }: { state: StepState }) {
  switch (state) {
    case "complete":
      return <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />;
    case "in_progress":
      return <Clock className="text-primary h-5 w-5 shrink-0 animate-pulse" />;
    case "failed":
      return <XCircle className="text-destructive h-5 w-5 shrink-0" />;
    default:
      return <Circle className="text-muted-foreground/40 h-5 w-5 shrink-0" />;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 3 — REVIEW
// ══════════════════════════════════════════════════════════════════════════════

interface ReviewScreenProps {
  agenticPost: AgenticPost | null;
  editedTweets: AgenticTweet[];
  editingIndex: number | null;
  editText: string;
  setEditText: (v: string) => void;
  rewritingIndex: number | null;
  showResearch: boolean;
  setShowResearch: (v: boolean) => void;
  scheduleDate: string;
  setScheduleDate: (v: string) => void;
  showSchedulePicker: boolean;
  setShowSchedulePicker: (v: boolean) => void;
  isSubmitting: boolean;
  selectedAccount: XAccountOption | undefined;
  onEditStart: (idx: number) => void;
  onEditSave: (idx: number) => void;
  onEditCancel: () => void;
  onRewrite: (idx: number) => void;
  onRemove: (idx: number) => void;
  onAddTweet: () => void;
  onApprove: (action: "post_now" | "schedule" | "save_draft") => void;
  onReorder: (activeId: string, overId: string) => void;
  onChangeTopic: () => void;
  onRegenerateAll: () => void;
  onDiscard: () => void;
}

function ReviewScreen({
  agenticPost,
  editedTweets,
  editingIndex,
  editText,
  setEditText,
  rewritingIndex,
  showResearch,
  setShowResearch,
  scheduleDate,
  setScheduleDate,
  showSchedulePicker,
  setShowSchedulePicker,
  isSubmitting,
  selectedAccount,
  onEditStart,
  onEditSave,
  onEditCancel,
  onRewrite,
  onRemove,
  onAddTweet,
  onApprove,
  onReorder,
  onChangeTopic,
  onRegenerateAll,
  onDiscard,
}: ReviewScreenProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  };
  if (!agenticPost) return null;

  const qualityStars = Math.round(agenticPost.qualityScore);

  return (
    <div className="animate-in fade-in mx-auto max-w-2xl space-y-4 pb-32 duration-300 lg:grid lg:max-w-5xl lg:grid-cols-[1fr_320px] lg:items-start lg:gap-6">
      {/* Main content column */}
      <div className="space-y-4">
        {/* Review header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm">Your post is ready</p>
            <h2 className="truncate font-semibold">{agenticPost.summary}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-3 rounded-full ${i < qualityStars ? "bg-amber-400" : "bg-muted"}`}
                />
              ))}
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              {agenticPost.qualityScore}/10
            </span>
          </div>
        </div>

        <Separator />

        {/* Tweet cards — sortable */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={editedTweets.map((_, i) => String(i))}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0">
              {editedTweets.map((tweet, idx) => (
                <div key={idx} className="relative">
                  {idx < editedTweets.length - 1 && (
                    <div className="bg-border absolute top-full left-5 z-10 h-4 w-0.5" />
                  )}
                  <SortableTweetCard
                    id={String(idx)}
                    tweet={tweet}
                    index={idx}
                    total={editedTweets.length}
                    isEditing={editingIndex === idx}
                    isRewriting={rewritingIndex === idx}
                    editText={editText}
                    setEditText={setEditText}
                    selectedAccount={selectedAccount}
                    onEditStart={() => onEditStart(idx)}
                    onEditSave={() => onEditSave(idx)}
                    onEditCancel={onEditCancel}
                    onRewrite={() => onRewrite(idx)}
                    onRemove={() => onRemove(idx)}
                  />
                  {idx < editedTweets.length - 1 && <div className="h-4" />}
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add tweet + Regenerate all */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={onAddTweet} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Tweet
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onChangeTopic}
              className="text-muted-foreground gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Change topic
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerateAll}
              className="text-muted-foreground gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate all
            </Button>
          </div>
        </div>

        {/* Research insights (collapsible on mobile, hidden on desktop) */}
        <div className="border-border overflow-hidden rounded-lg border lg:hidden">
          <button
            onClick={() => setShowResearch(!showResearch)}
            className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors"
          >
            <span>Research Insights</span>
            {showResearch ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showResearch && (
            <div className="space-y-3 border-t px-4 py-4 text-sm">
              <ResearchInsightsContent agenticPost={agenticPost} />
            </div>
          )}
        </div>

        {/* Sticky action bar */}
        <div className="bg-background/95 fixed right-0 bottom-0 left-0 z-50 border-t px-4 py-4 backdrop-blur-sm md:static md:bottom-auto md:rounded-xl md:border md:px-6">
          {showSchedulePicker && (
            <div className="mb-4 flex items-center gap-3">
              <DatePicker value={scheduleDate} onChange={setScheduleDate} />
              {scheduleDate && (
                <Button size="sm" onClick={() => onApprove("schedule")} disabled={isSubmitting}>
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  Confirm Schedule
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setShowSchedulePicker(false)}>
                Cancel
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => onApprove("post_now")}
              disabled={isSubmitting}
              className="flex-1 gap-2 sm:flex-none"
            >
              {isSubmitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post Now
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowSchedulePicker(true);
              }}
              disabled={isSubmitting}
              className="flex-1 gap-2 sm:flex-none"
            >
              <Calendar className="h-4 w-4" />
              {scheduleDate ? `Schedule for ${scheduleDate}` : "Schedule"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onApprove("save_draft")}
              disabled={isSubmitting}
              className="text-muted-foreground gap-1.5"
            >
              <BookmarkIcon className="h-3.5 w-3.5" />
              Save Draft
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive ml-auto gap-1.5"
              onClick={onDiscard}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Discard
            </Button>
          </div>
        </div>
      </div>
      {/* end main content column */}

      {/* Research Insights sidebar (desktop only) */}
      <div className="hidden lg:block">
        <div className="border-border sticky top-4 overflow-hidden rounded-lg border">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-medium">Research Insights</p>
          </div>
          <div className="space-y-3 px-4 py-4 text-sm">
            <ResearchInsightsContent agenticPost={agenticPost} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared research insights content ─────────────────────────────────────────

function ResearchInsightsContent({ agenticPost }: { agenticPost: AgenticPost }) {
  return (
    <>
      <div>
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
          Recommended Angle
        </p>
        <p>{agenticPost.research.recommendedAngle}</p>
      </div>
      {agenticPost.research.trendingHashtags.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
            Trending Hashtags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {agenticPost.research.trendingHashtags.map((h) => (
              <span
                key={h}
                className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs"
              >
                #{h}
              </span>
            ))}
          </div>
        </div>
      )}
      {agenticPost.research.keyFacts.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
            Key Facts
          </p>
          <ul className="space-y-1">
            {agenticPost.research.keyFacts.map((f, i) => (
              <li key={i} className="text-muted-foreground flex gap-1.5 text-xs">
                <span className="text-primary shrink-0">•</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
          Content Plan
        </p>
        <p className="text-muted-foreground">{agenticPost.plan.rationale}</p>
      </div>
    </>
  );
}

// ── Sortable wrapper for drag-and-drop ────────────────────────────────────────

function SortableTweetCard({ id, ...props }: { id: string } & AgenticTweetCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <AgenticTweetCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

// ── Individual tweet card on review screen ─────────────────────────────────

interface AgenticTweetCardProps {
  tweet: AgenticTweet;
  index: number;
  total: number;
  isEditing: boolean;
  isRewriting: boolean;
  editText: string;
  setEditText: (v: string) => void;
  selectedAccount: XAccountOption | undefined;
  onEditStart: () => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onRewrite: () => void;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

function AgenticTweetCard({
  tweet,
  index,
  total,
  isEditing,
  isRewriting,
  editText,
  setEditText,
  selectedAccount,
  onEditStart,
  onEditSave,
  onEditCancel,
  onRewrite,
  onRemove,
  dragHandleProps,
}: AgenticTweetCardProps) {
  const charCount = isEditing ? editText.length : tweet.charCount;
  const isOverLimit = charCount > 280;

  return (
    <Card
      role="article"
      aria-label={`Tweet ${index + 1} of ${total}`}
      className={`relative transition-shadow hover:shadow-sm ${isRewriting ? "opacity-60" : ""}`}
    >
      <CardContent className="space-y-3 px-4 pt-4 pb-3">
        {/* Card header */}
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            {dragHandleProps && (
              <button
                type="button"
                aria-label="Drag to reorder tweet"
                className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab touch-none transition-colors active:cursor-grabbing"
                {...dragHandleProps}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}
            <Avatar className="h-5 w-5">
              <AvatarImage src={selectedAccount?.profileImageUrl ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {selectedAccount?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>@{selectedAccount?.username}</span>
            {selectedAccount && (
              <XSubscriptionBadge tier={selectedAccount.subscriptionTier} size="sm" />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-muted-foreground/60">
              {index + 1}/{total}
            </span>
            <span className={isOverLimit ? "text-destructive font-medium" : ""}>
              {charCount}/280
            </span>
          </div>
        </div>

        {/* Tweet body */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[80px] resize-none text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={onEditSave}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={onEditCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {tweet.text}
            {tweet.hashtags.length > 0 && (
              <span className="text-primary"> {tweet.hashtags.map((h) => `#${h}`).join(" ")}</span>
            )}
          </div>
        )}

        {/* Image */}
        {tweet.imageUrl && (
          <div className="border-border group relative overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tweet.imageUrl}
              alt={tweet.imagePrompt ?? "AI generated image"}
              className="max-h-64 w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-colors group-hover:bg-black/30 group-hover:opacity-100">
              <button
                className="bg-background/90 hover:bg-background flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium"
                onClick={onRewrite}
              >
                <ImageIcon className="h-3 w-3" />
                New Image
              </button>
            </div>
          </div>
        )}
        {tweet.hasImage && !tweet.imageUrl && (
          <div className="border-border bg-muted/30 text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center text-xs">
            <ImageIcon className="text-muted-foreground/40 h-5 w-5" />
            <span>Image couldn&apos;t be generated.</span>
            <button className="text-primary underline hover:no-underline" onClick={onRewrite}>
              Retry
            </button>
          </div>
        )}

        {/* Action row */}
        {!isEditing && (
          <div className="flex gap-1 pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground h-7 gap-1 text-xs"
              onClick={onEditStart}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground h-7 gap-1 text-xs"
              onClick={onRewrite}
              disabled={isRewriting}
            >
              <RefreshCw className={`h-3 w-3 ${isRewriting ? "animate-spin" : ""}`} />
              {isRewriting ? "Rewriting…" : "Rewrite"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive h-7 gap-1 text-xs"
              onClick={onRemove}
            >
              <X className="h-3 w-3" />
              Remove
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Success screen ─────────────────────────────────────────────────────────────

function SuccessScreen({
  action,
  scheduleDate,
  onCreateAnother,
}: {
  action: string;
  scheduleDate?: string;
  onCreateAnother: () => void;
}) {
  const message =
    action === "post_now"
      ? "Thread queued for posting! 🎉"
      : action === "schedule"
        ? `Scheduled for ${scheduleDate ?? "later"} ✓`
        : "Saved as draft ✓";

  return (
    <div className="animate-in fade-in mx-auto max-w-md space-y-6 py-16 text-center duration-300">
      <div className="text-5xl">✨</div>
      <div>
        <h2 className="text-xl font-semibold">{message}</h2>
        <p className="text-muted-foreground mt-1 text-sm">Your AI-generated content is ready.</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Button onClick={onCreateAnother} className="gap-2">
          <Wand2 className="h-4 w-4" />
          Create Another
        </Button>
        <div className="flex gap-4 text-sm">
          <Link
            href="/dashboard/queue"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ListOrdered className="h-3.5 w-3.5" />
            View in Queue
          </Link>
          <Link
            href="/dashboard/calendar"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Calendar className="h-3.5 w-3.5" />
            Go to Calendar
          </Link>
        </div>
      </div>
    </div>
  );
}
