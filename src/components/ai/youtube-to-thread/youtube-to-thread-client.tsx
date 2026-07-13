"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Youtube, ArrowLeft, RefreshCw, History, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AiResultActions } from "@/components/ai/shared/ai-result-actions";
import { JobProgressCard } from "@/components/ai/shared/job-progress-card";
import { ThreadResultPreview } from "@/components/ai/shared/thread-result-preview";
import type { TweetData, ThreadResult } from "@/components/ai/shared/types";
import { useJobPolling } from "@/components/ai/shared/use-job-polling";
import { YoutubeUrlInput } from "@/components/ai/youtube-to-thread/youtube-url-input";
import type { YoutubeUrlSubmitData } from "@/components/ai/youtube-to-thread/youtube-url-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { sendToComposer } from "@/lib/composer-bridge";

// ── Types ──────────────────────────────────────────────────────────────

type FlowStatus =
  | "idle"
  | "queued"
  | "downloading"
  | "transcribing"
  | "generating"
  | "ready"
  | "failed"
  | "error";

interface RecentJob {
  id: string;
  title: string;
  youtubeVideoId: string;
  thumbnailUrl: string;
  completedAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────

const PHASE_LABEL_KEYS: Record<string, string> = {
  queued: "progress.queued",
  downloading: "progress.downloading",
  transcribing: "progress.transcribing",
  generating: "progress.generating",
  ready: "progress.ready",
  failed: "progress.failed",
};

const PHASE_ORDER = ["downloading", "transcribing", "generating"] as const;

const ERROR_CODE_I18N_KEYS: Record<string, string> = {
  VIDEO_PRIVATE: "errors.video_private",
  VIDEO_AGE_GATED: "errors.video_age_gated",
  VIDEO_LIVE: "errors.video_live",
  VIDEO_TOO_LONG: "errors.video_too_long",
  VIDEO_TOO_SHORT: "errors.video_too_short",
  VIDEO_NO_AUDIO: "errors.video_no_audio",
  TRANSCRIPTION_FAILED: "errors.transcription_failed",
  MODERATION_FLAGGED: "errors.moderation_flagged",
  PROVIDER_ERROR: "errors.provider_error",
  CANCELLED: "errors.cancelled",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Component ──────────────────────────────────────────────────────────

export function YoutubeToThreadClient() {
  const t = useTranslations("ai_hub");
  // Accesses ai_hub.youtube_to_thread.* keys — no separate top-level namespace needed.
  const YT_NS = "youtube_to_thread.";
  const yt = useCallback(
    (key: string, values?: Record<string, string | number>) =>
      key
        ? (t((YT_NS + key) as Parameters<typeof t>[0], values as Parameters<typeof t>[1]) as string)
        : "",
    [t]
  );
  const upgradeModal = useUpgradeModal();

  // ── Deep-link (?url=) ──────────────────────────────────────────────
  // When arriving from AI Discovery, prefill the URL input and let it
  // auto-run the free preview. Additive — absent param = unchanged flow.
  const searchParams = useSearchParams();
  const initialUrl = useMemo(() => searchParams.get("url")?.trim() ?? "", [searchParams]);

  // ── State ──────────────────────────────────────────────────────────

  const [status, setStatus] = useState<FlowStatus>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [threadResult, setThreadResult] = useState<ThreadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [transcript, setTranscript] = useState<string | undefined>(undefined);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);

  // First-tweet image generation
  const [includeFirstTweetImage, setIncludeFirstTweetImage] = useState(false);
  const [firstTweetImageUrl, setFirstTweetImageUrl] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [imageQuotaExhausted, setImageQuotaExhausted] = useState(false);
  const imageAbortRef = useRef<AbortController | null>(null);
  const [finalElapsedSeconds, setFinalElapsedSeconds] = useState<number | null>(null);
  const [resultMeta, setResultMeta] = useState<{
    durationSeconds?: number;
    provider?: string;
    language?: string;
  } | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

  // Ref to store last submitted data for regenerate
  const lastSubmitDataRef = useRef<YoutubeUrlSubmitData | null>(null);

  // ── Cleanup image abort on unmount ──────────────────────────────────

  useEffect(() => {
    return () => {
      imageAbortRef.current?.abort();
    };
  }, []);

  // ── Image quota fetch ───────────────────────────────────────────────

  useEffect(() => {
    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), 8_000);
    fetch("/api/ai/image/quota", { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setImageQuotaExhausted((data.remainingImages ?? -1) === 0);
      })
      .catch(() => {});
    return () => {
      clearTimeout(timeoutId);
      ac.abort();
    };
  }, []);

  // ── Recent jobs fetch ───────────────────────────────────────────────

  useEffect(() => {
    if (status !== "idle") return;
    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), 8_000);
    fetch("/api/ai/youtube-to-thread/history", { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.items) setRecentJobs(payload.items as RecentJob[]);
      })
      .catch(() => {});
    return () => {
      clearTimeout(timeoutId);
      ac.abort();
    };
  }, [status]);

  // ── Reset ──────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStatus("idle");
    setJobId(null);
    setThreadResult(null);
    setErrorMessage("");
    setIsLoading(false);
    setEstimatedSeconds(null);
    setTranscript(undefined);
    setErrorCode(undefined);
    setFinalElapsedSeconds(null);
    setResultMeta(null);
    setCurrentVideoId(null);
    setFirstTweetImageUrl(null);
    setImageStatus("idle");
  }, []);

  // ── Submit handler ─────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (data: YoutubeUrlSubmitData) => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const res = await fetch("/api/ai/youtube-to-thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const responseData = await res.json();

        if (!res.ok) {
          // 409 duplicate in-flight
          if (res.status === 409) {
            const existingJobId = responseData.existingJobId as string;
            if (existingJobId) {
              setJobId(existingJobId);
              setStatus("queued");
              setIsLoading(false);
              toast.error(yt("errors.duplicate_in_flight"));
              return;
            }
            toast.error(yt("errors.duplicate_in_flight"));
            setIsLoading(false);
            return;
          }

          // 402 plan limit
          if (res.status === 402) {
            upgradeModal.openWithContext({
              error: responseData.error,
              code: responseData.code,
              message: responseData.message,
              feature: responseData.feature,
              plan: responseData.plan,
              limit: responseData.limit,
              used: responseData.used,
              remaining: responseData.remaining,
              upgradeUrl: responseData.upgrade_url,
              suggestedPlan: responseData.suggested_plan,
              trialActive: responseData.trial_active,
              resetAt: responseData.reset_at,
            });
            setIsLoading(false);
            setStatus("error");
            setErrorMessage(yt("errors.upgrade_required"));
            return;
          }

          if (res.status === 429) {
            toast.error(yt("errors.rate_limited"));
            setIsLoading(false);
            setStatus("idle");
            return;
          }

          toast.error((responseData.error as string) ?? yt("errors.generation_failed"));
          setIsLoading(false);
          setStatus("error");
          setErrorMessage((responseData.error as string) ?? yt("errors.generation_failed"));
          return;
        }

        // Store last submit data for regenerate
        lastSubmitDataRef.current = data;

        // Success — enqueued
        setJobId(responseData.jobId as string);
        setCurrentVideoId((responseData.youtubeVideoId as string) ?? null);
        const durationSeconds = Number(responseData.durationSeconds ?? 0);
        setEstimatedSeconds(
          durationSeconds > 0 ? Math.max(20, Math.round(durationSeconds / 5)) : 20
        );
        setStatus("queued");
        setIsLoading(false);
      } catch (err) {
        if (err instanceof TypeError) {
          toast.error(yt("errors.generation_failed"));
        }
        setIsLoading(false);
        setStatus("error");
        setErrorMessage(yt("errors.generation_failed"));
      }
    },
    [upgradeModal, yt]
  );

  // ── Cancel handler ─────────────────────────────────────────────────

  const handleCancel = useCallback(async () => {
    if (!jobId) return;
    try {
      await fetch(`/api/ai/youtube-to-thread/${jobId}`, { method: "DELETE" });
    } catch {
      // Best-effort cancel
    }
    handleReset();
  }, [jobId, handleReset]);

  // ── Send to composer ───────────────────────────────────────────────

  const handleSendToComposer = useCallback(async () => {
    if (!threadResult) return;

    let imageUrl = firstTweetImageUrl;

    if (includeFirstTweetImage && !imageUrl && imageStatus !== "generating") {
      setImageStatus("generating");

      imageAbortRef.current?.abort();
      const ac = new AbortController();
      imageAbortRef.current = ac;
      const timeoutId = setTimeout(() => ac.abort(), 70_000);

      try {
        const prompt = `${threadResult.title}\n\n${threadResult.tweets[0]?.text ?? ""}`.slice(
          0,
          600
        );
        const res = await fetch("/api/ai/thread-first-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, source: "youtube-to-thread" }),
          signal: ac.signal,
        });

        if (res.status === 402) {
          const data = await res.json();
          upgradeModal.openWithContext({
            error: data.error,
            code: data.code,
            message: data.message,
            feature: data.feature,
            plan: data.plan,
            limit: data.limit,
            used: data.used,
            remaining: data.remaining,
            upgradeUrl: data.upgrade_url,
            suggestedPlan: data.suggested_plan,
            trialActive: data.trial_active,
            resetAt: data.reset_at,
          });
          setImageStatus("error");
          return;
        }

        if (!res.ok) {
          toast.error(yt("options.include_first_tweet_image_failed"));
          setImageStatus("error");
          return;
        }

        const data = await res.json();
        imageUrl = data.url as string;
        setFirstTweetImageUrl(imageUrl);
        setImageStatus("ready");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        toast.error(yt("options.include_first_tweet_image_failed"));
        setImageStatus("error");
        return;
      } finally {
        clearTimeout(timeoutId);
        imageAbortRef.current = null;
      }
    }

    sendToComposer(
      threadResult.tweets.map((t) => t.text),
      {
        source: "youtube-to-thread",
        ...(imageUrl ? { firstTweetImage: { url: imageUrl } } : {}),
      }
    );
  }, [threadResult, includeFirstTweetImage, firstTweetImageUrl, imageStatus, upgradeModal, yt]);

  // ── Regenerate handler ────────────────────────────────────────────────
  //
  // Why: transcript is stored server-side keyed by jobId, so we re-run
  // generation directly. Do NOT call handleReset() here — that drops jobId
  // and forces a wasteful re-download + re-transcribe (extra quota hit).
  // Params (language, tweetCount, tone) come from lastSubmitDataRef — we
  // preserve the original submission options without re-parsing the URL.

  const handleRegenerate = useCallback(async () => {
    const data = lastSubmitDataRef.current;
    if (!jobId || !data) {
      handleReset();
      return;
    }

    setStatus("generating");
    setErrorMessage("");

    try {
      const res = await fetch("/api/ai/youtube-to-thread/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          language: data.language,
          tweetCount: data.tweetCount,
          tone: data.tone,
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          upgradeModal.openWithContext({
            error: responseData.error,
            code: responseData.code,
            message: responseData.message,
            feature: responseData.feature,
            plan: responseData.plan,
            limit: responseData.limit,
            used: responseData.used,
            remaining: responseData.remaining,
            upgradeUrl: responseData.upgrade_url,
            suggestedPlan: responseData.suggested_plan,
            trialActive: responseData.trial_active,
            resetAt: responseData.reset_at,
          });
          setStatus("ready");
          setErrorMessage(yt("errors.upgrade_required"));
          return;
        }

        toast.error((responseData.error as string) ?? yt("errors.generation_failed"));
        setStatus("ready");
        setErrorMessage((responseData.error as string) ?? yt("errors.generation_failed"));
        return;
      }

      // Success — map API response to internal shape
      const tweets: TweetData[] = Array.isArray(responseData.tweets)
        ? responseData.tweets.map((t: string | TweetData) =>
            typeof t === "string" ? { text: t, charCount: t.length } : t
          )
        : [];

      const sourceLanguage = (responseData.sourceLanguage as string | undefined) ?? undefined;
      setThreadResult({
        tweets,
        title: (responseData.title as string) ?? "",
        ...(sourceLanguage !== undefined && { sourceLanguage }),
      });
      setStatus("ready");
      toast.success(yt("result.generated_success"));
    } catch {
      setStatus("ready");
      setErrorMessage(yt("errors.generation_failed"));
      toast.error(yt("errors.generation_failed"));
    }
  }, [jobId, upgradeModal, yt, handleReset]);

  // ── Recent job click handler ───────────────────────────────────────

  const handleRecentJobClick = useCallback(
    async (jobId: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/ai/youtube-to-thread/${jobId}`);
        if (!res.ok) {
          toast.error(yt("errors.generation_failed"));
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        const result = data.threadResult as ThreadResult | null;
        if (result) {
          setThreadResult({
            tweets: result.tweets ?? [],
            title: result.title ?? "",
            ...(result.sourceLanguage !== undefined && {
              sourceLanguage: result.sourceLanguage,
            }),
          });
          setTranscript((data.transcript as string) ?? undefined);
          setStatus("ready");
          setJobId(jobId);
        }
      } catch {
        toast.error(yt("errors.generation_failed"));
      } finally {
        setIsLoading(false);
      }
    },
    [yt]
  );

  // ── Polling (shared hook) ───────────────────────────────────────────

  const isProgressPhase =
    status === "queued" ||
    status === "downloading" ||
    status === "transcribing" ||
    status === "generating";

  const { elapsedSeconds, connectionIssue } = useJobPolling({
    jobId,
    pollEndpoint: "/api/ai/youtube-to-thread",
    isProgressPhase,
    onReady: (data, finalElapsed) => {
      setFinalElapsedSeconds(finalElapsed);
      setResultMeta({
        ...(data.durationSeconds !== undefined && {
          durationSeconds: data.durationSeconds as number,
        }),
        ...(data.provider !== undefined && { provider: data.provider as string }),
        ...(data.language !== undefined && { language: data.language as string }),
      });
      if (data.youtubeVideoId) {
        setCurrentVideoId(data.youtubeVideoId as string);
      }
      setStatus("ready");
      const result = data.threadResult as {
        tweets: TweetData[];
        title: string;
        sourceLanguage?: string;
      } | null;
      if (result) {
        setThreadResult({
          tweets: result.tweets ?? [],
          title: result.title ?? "",
          ...(result.sourceLanguage !== undefined && {
            sourceLanguage: result.sourceLanguage,
          }),
        });
      }
      setTranscript((data.transcript as string) ?? undefined);
      toast.success(yt("result.generated_success"));
    },
    onFailed: (error, code) => {
      setStatus("failed");
      setErrorMessage(error ?? yt("errors.generation_failed"));
      setErrorCode(code ?? undefined);
    },
    onStatusChange: (newStatus) => {
      setStatus(newStatus as FlowStatus);
    },
  });

  // ── Phase helpers ──────────────────────────────────────────────────

  const currentPhaseIndex = isProgressPhase
    ? status === "queued"
      ? -1
      : PHASE_ORDER.indexOf(status as (typeof PHASE_ORDER)[number])
    : -1;

  // Pre-compute phase items for JobProgressCard (M5a: PHASE_LABEL_KEYS only)
  const progressPhases = PHASE_ORDER.map((phase) => ({
    key: phase,
    label: yt(PHASE_LABEL_KEYS[phase]!),
  }));

  const statusLabel = yt(PHASE_LABEL_KEYS[status] ?? "");

  const elapsedLabel = yt("progress.elapsed", { seconds: elapsedSeconds });

  const estimatedTimeLabel =
    estimatedSeconds !== null ? yt("progress.estimated_time", { seconds: estimatedSeconds }) : "";

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* IDLE state: URL input form + recent jobs */}
      {status === "idle" && (
        <div className="space-y-6">
          <YoutubeUrlInput
            onSubmit={handleSubmit}
            isLoading={isLoading}
            includeFirstTweetImage={includeFirstTweetImage}
            onIncludeFirstTweetImageChange={setIncludeFirstTweetImage}
            imageQuotaExhausted={imageQuotaExhausted}
            {...(initialUrl !== "" && { initialUrl })}
          />
          {recentJobs.length > 0 && (
            <Card>
              <CardContent className="px-4 py-4">
                <div className="mb-3 flex items-center gap-2">
                  <History className="text-muted-foreground h-4 w-4" />
                  <p className="text-muted-foreground text-sm font-medium">{yt("recent.title")}</p>
                </div>
                <div className="divide-y">
                  {recentJobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      className="hover:bg-muted/50 flex w-full items-center gap-3 px-1 py-2.5 text-start transition-colors"
                      onClick={() => handleRecentJobClick(job.id)}
                    >
                      <div className="bg-muted relative h-10 w-16 shrink-0 overflow-hidden rounded">
                        <Image
                          src={job.thumbnailUrl}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm">
                          {job.title || yt("recent.untitled")}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(job.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* PROGRESS: queued / downloading / transcribing / generating */}
      {isProgressPhase && (
        <div className="space-y-5">
          {/* Navigation */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-1.5"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {yt("actions.back")}
          </Button>

          {/* Shared progress card */}
          <JobProgressCard
            statusLabel={statusLabel}
            elapsedLabel={elapsedLabel}
            phases={progressPhases}
            currentPhaseIndex={currentPhaseIndex}
            estimatedSeconds={estimatedSeconds}
            estimatedTimeLabel={estimatedTimeLabel}
            connectionIssue={connectionIssue}
            connectionIssueLabel={yt("errors.polling_connection")}
            onCancel={handleCancel}
            cancelLabel={yt("actions.cancel")}
            backLabel={yt("actions.back")}
            cancelConfirmTitle={yt("actions.cancel_confirm_title")}
            cancelConfirmDescription={yt("actions.cancel_confirm_description")}
            spinnerMuted={status === "queued"}
          />
        </div>
      )}

      {/* READY: Thread result */}
      {status === "ready" && threadResult && (
        <div className="space-y-5">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-1.5"
            onClick={handleReset}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {yt("actions.back")}
          </Button>

          <AiResultActions
            itemCount={threadResult.tweets.length}
            onRegenerate={handleRegenerate}
            onSendToComposer={handleSendToComposer}
            sendToComposerDisabled={imageStatus === "generating"}
          />

          <ThreadResultPreview
            tweets={threadResult.tweets}
            title={threadResult.title}
            {...(threadResult.sourceLanguage !== undefined && {
              sourceLanguage: threadResult.sourceLanguage,
            })}
            {...(transcript !== undefined && { transcript })}
            {...(transcript !== undefined && { transcriptLabel: yt("result.show_transcript") })}
            {...(currentVideoId !== null && {
              thumbnailUrl: `https://i.ytimg.com/vi/${currentVideoId}/hqdefault.jpg`,
              videoUrl: `https://www.youtube.com/watch?v=${currentVideoId}`,
              videoUrlLabel: yt("result.watch_on_youtube"),
            })}
            {...(resultMeta !== null && {
              meta: {
                ...(resultMeta.durationSeconds !== undefined && {
                  durationLabel: formatDuration(resultMeta.durationSeconds),
                }),
                ...(resultMeta.provider !== undefined && { provider: resultMeta.provider }),
                ...(resultMeta.language !== undefined && { language: resultMeta.language }),
                ...(finalElapsedSeconds !== null && { generatedInSeconds: finalElapsedSeconds }),
              },
            })}
          />
        </div>
      )}

      {/* FAILED: Error with retry */}
      {status === "failed" && (
        <div className="space-y-5" role="alert">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-col items-center gap-4 px-4 py-8 text-center">
              <Youtube className="text-destructive h-10 w-10" />
              <div className="space-y-1">
                <p className="text-foreground text-sm font-semibold">
                  {errorCode && ERROR_CODE_I18N_KEYS[errorCode]
                    ? yt(ERROR_CODE_I18N_KEYS[errorCode]!)
                    : yt("errors.generation_failed")}
                </p>
                {errorMessage && <p className="text-muted-foreground text-xs">{errorMessage}</p>}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  {yt("actions.back")}
                </Button>
                <Button size="sm" onClick={handleReset} className="gap-1.5">
                  <RefreshCw className="h-4 w-4" />
                  {yt("actions.retry")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ERROR: Generic error */}
      {status === "error" && (
        <Card className="border-destructive/30 bg-destructive/5" role="alert">
          <CardContent className="flex flex-col items-center gap-4 px-4 py-8 text-center">
            <Youtube className="text-destructive h-10 w-10" />
            <div className="space-y-1">
              <p className="text-foreground text-sm font-semibold">
                {yt("errors.generation_failed")}
              </p>
              {errorMessage && <p className="text-muted-foreground text-xs">{errorMessage}</p>}
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              {yt("actions.retry")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
