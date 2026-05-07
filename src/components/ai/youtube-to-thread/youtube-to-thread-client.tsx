"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Youtube, ArrowLeft, RefreshCw, Loader2, History, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ThreadResultPreview } from "@/components/ai/pdf-to-thread/thread-result-preview";
import { YoutubeUrlInput } from "@/components/ai/youtube-to-thread/youtube-url-input";
import type { YoutubeUrlSubmitData } from "@/components/ai/youtube-to-thread/youtube-url-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { cn } from "@/lib/utils";

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

interface TweetData {
  text: string;
  charCount: number;
}

interface ThreadResult {
  tweets: TweetData[];
  title: string;
  sourceLanguage?: string;
}

interface RecentJob {
  id: string;
  title: string;
  youtubeVideoId: string;
  thumbnailUrl: string;
  completedAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 8_000;
const MAX_CONSECUTIVE_FAILURES = 5;
const MAX_POLL_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const PHASE_LABEL_KEYS: Record<string, string> = {
  queued: "",
  downloading: "youtube_to_thread.progress.downloading",
  transcribing: "youtube_to_thread.progress.transcribing",
  generating: "youtube_to_thread.progress.generating",
};

const PHASE_STATUS_KEYS: Record<string, string> = {
  queued: "",
  downloading: "youtube_to_thread.progress.downloading",
  transcribing: "youtube_to_thread.progress.transcribing",
  generating: "youtube_to_thread.progress.generating",
};

const PHASE_ORDER = ["downloading", "transcribing", "generating"] as const;

const ERROR_CODE_I18N_KEYS: Record<string, string> = {
  VIDEO_PRIVATE: "errors.video_private",
  VIDEO_AGE_GATED: "errors.video_age_gated",
  VIDEO_LIVE: "errors.video_live",
  VIDEO_TOO_LONG: "errors.video_too_long",
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
  const yt = useTranslations("youtube_to_thread");
  const router = useRouter();
  const upgradeModal = useUpgradeModal();

  // ── State ──────────────────────────────────────────────────────────

  const [status, setStatus] = useState<FlowStatus>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [threadResult, setThreadResult] = useState<ThreadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
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

  // Ref to hold the latest jobId for the poller closure
  const jobIdRef = useRef<string | null>(null);
  jobIdRef.current = jobId;

  // Ref to store last submitted data for regenerate
  const lastSubmitDataRef = useRef<YoutubeUrlSubmitData | null>(null);

  // Poll resilience refs
  const retryCountRef = useRef(0);
  const pollStartTimeRef = useRef(0);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedSecondsRef = useRef(0);

  // ── Elapsed timer ──────────────────────────────────────────────────

  const startElapsedTimer = useCallback(() => {
    setElapsedSeconds(0);
    elapsedSecondsRef.current = 0;
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    elapsedIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        elapsedSecondsRef.current = next;
        return next;
      });
    }, 1000);
  }, []);

  const stopElapsedTimer = useCallback(() => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  // Cleanup timer + image abort on unmount
  useEffect(() => {
    return () => {
      stopElapsedTimer();
      imageAbortRef.current?.abort();
    };
  }, [stopElapsedTimer]);

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
    setConnectionIssue(false);
    setIsLoading(false);
    stopElapsedTimer();
    setElapsedSeconds(0);
    setEstimatedSeconds(null);
    setTranscript(undefined);
    setErrorCode(undefined);
    setFinalElapsedSeconds(null);
    setResultMeta(null);
    setCurrentVideoId(null);
    setFirstTweetImageUrl(null);
    setImageStatus("idle");
  }, [stopElapsedTimer]);

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
              pollStartTimeRef.current = Date.now();
              startElapsedTimer();
              toast.error(yt("errors.duplicate_in_flight"));
              return;
            }
            toast.error(yt("errors.duplicate_in_flight"));
            setIsLoading(false);
            return;
          }

          // 402 plan limit
          if (res.status === 402) {
            upgradeModal.openWithContext(responseData);
            setIsLoading(false);
            setStatus("error");
            setErrorMessage(yt("errors.upgrade_required"));
            return;
          }

          if (res.status === 429) {
            toast.error(t("pdf_to_thread.errors.rate_limited"));
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
        pollStartTimeRef.current = Date.now();
        startElapsedTimer();
      } catch (err) {
        if (err instanceof TypeError) {
          toast.error(yt("errors.generation_failed"));
        }
        setIsLoading(false);
        setStatus("error");
        setErrorMessage(yt("errors.generation_failed"));
      }
    },
    [upgradeModal, t, yt, startElapsedTimer]
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
          upgradeModal.openWithContext(data);
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

    sessionStorage.setItem(
      "composer_payload",
      JSON.stringify({
        tweets: threadResult.tweets.map((t) => t.text),
        source: "youtube-to-thread",
        ...(imageUrl && { firstTweetImage: { url: imageUrl } }),
      })
    );
    router.push("/dashboard/compose?source=youtube-to-thread");
  }, [
    threadResult,
    router,
    includeFirstTweetImage,
    firstTweetImageUrl,
    imageStatus,
    upgradeModal,
    yt,
  ]);

  // ── Regenerate handler ──────────────────────────────────────────────

  const handleRegenerate = useCallback(() => {
    const data = lastSubmitDataRef.current;
    if (!data) return;
    handleReset();
    // Reset is synchronous, so status becomes "idle" and then we submit
    setTimeout(() => {
      void handleSubmit(data);
    }, 50);
  }, [handleReset, handleSubmit]);

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

  // ── Polling (hard rule #10: AbortController + 8s timeout) ──────────

  useEffect(() => {
    if (
      status !== "queued" &&
      status !== "downloading" &&
      status !== "transcribing" &&
      status !== "generating"
    )
      return;

    const abortRef = { current: null as AbortController | null };
    let active = true;
    retryCountRef.current = 0;
    setConnectionIssue(false);

    const tick = async () => {
      const currentJobId = jobIdRef.current;
      if (!currentJobId || !active) return;

      // Max-wait timeout check
      if (Date.now() - pollStartTimeRef.current > MAX_POLL_DURATION_MS) {
        setStatus("error");
        setErrorMessage(yt("errors.polling_timeout"));
        stopElapsedTimer();
        return;
      }

      // Abort any in-flight request before starting a new one
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const timeoutId = setTimeout(() => ac.abort(), POLL_TIMEOUT_MS);

      try {
        const res = await fetch(`/api/ai/youtube-to-thread/${currentJobId}`, {
          signal: ac.signal,
        });

        if (!active) return;

        if (!res.ok) {
          retryCountRef.current += 1;
          if (retryCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
            setConnectionIssue(true);
          }
          return;
        }

        // Success — reset failure counter
        retryCountRef.current = 0;
        setConnectionIssue(false);

        const data = await res.json();

        if (!active) return;

        const pollStatus = data.status as string;

        if (pollStatus === "ready") {
          stopElapsedTimer();
          setFinalElapsedSeconds(elapsedSecondsRef.current);
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
          toast.success(t("pdf_to_thread.result.generated_success") as string);
        } else if (pollStatus === "failed") {
          stopElapsedTimer();
          setStatus("failed");
          setErrorMessage((data.error as string) ?? yt("errors.generation_failed"));
          setErrorCode((data.errorCode as string) ?? undefined);
        } else if (
          pollStatus === "queued" ||
          pollStatus === "downloading" ||
          pollStatus === "transcribing" ||
          pollStatus === "generating"
        ) {
          setStatus(pollStatus as FlowStatus);
        }
        // Unknown status stays as-is
      } catch (err) {
        if (!active) return;
        if (err instanceof Error && err.name !== "AbortError") {
          retryCountRef.current += 1;
          if (retryCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
            setConnectionIssue(true);
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };

    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const jitter = (Math.random() - 0.5) * 1000; // ±500ms
      timeoutId = setTimeout(() => {
        void tick().finally(() => {
          if (active) scheduleNext();
        });
      }, POLL_INTERVAL_MS + jitter);
    };

    scheduleNext();

    return () => {
      active = false;
      clearTimeout(timeoutId);
      abortRef.current?.abort();
    };
  }, [status, t, yt, stopElapsedTimer]);

  // ── Phase helpers ──────────────────────────────────────────────────

  const isProgressPhase =
    status === "queued" ||
    status === "downloading" ||
    status === "transcribing" ||
    status === "generating";

  const currentPhaseIndex = isProgressPhase
    ? status === "queued"
      ? -1
      : PHASE_ORDER.indexOf(status as (typeof PHASE_ORDER)[number])
    : -1;

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
                      className="hover:bg-muted/50 flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors"
                      onClick={() => handleRecentJobClick(job.id)}
                    >
                      <Image
                        src={job.thumbnailUrl}
                        alt=""
                        width={64}
                        height={40}
                        className="bg-muted shrink-0 rounded object-cover"
                      />
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
            onClick={handleReset}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {yt("actions.back")}
          </Button>

          {/* Progress card */}
          <Card className="border-brand-6 bg-brand-3/10">
            <CardContent className="flex flex-col items-center gap-4 px-4 py-8 sm:py-10">
              <Loader2
                className={cn(
                  "h-10 w-10 animate-spin",
                  status === "queued" ? "text-muted-foreground" : "text-brand-9"
                )}
                aria-hidden="true"
              />

              <div className="space-y-1 text-center" aria-live="polite" aria-atomic="true">
                <p className="text-foreground text-sm font-semibold">
                  {status === "queued"
                    ? t("pdf_to_thread.progress.queued")
                    : t(PHASE_LABEL_KEYS[status] ?? "")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {yt("progress.elapsed", { seconds: elapsedSeconds })}
                </p>
              </div>

              {/* Phase dots */}
              <div className="flex items-center gap-2" aria-hidden="true">
                {PHASE_ORDER.map((phase, idx) => {
                  const isActive = idx <= currentPhaseIndex;
                  const isCurrent = idx === currentPhaseIndex;
                  return (
                    <div key={phase} className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full transition-colors",
                          isActive ? "bg-brand-9" : "bg-muted",
                          isCurrent && "animate-pulse"
                        )}
                      />
                      {idx < PHASE_ORDER.length - 1 && (
                        <div
                          className={cn("h-0.5 w-8 rounded", isActive ? "bg-brand-9" : "bg-muted")}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Phase labels */}
              <div className="flex w-full max-w-xs items-start justify-between gap-1">
                {PHASE_ORDER.map((phase, idx) => {
                  const isActive = idx <= currentPhaseIndex;
                  return (
                    <span
                      key={phase}
                      className={cn(
                        "text-center text-[10px] leading-tight",
                        isActive ? "text-foreground font-medium" : "text-muted-foreground"
                      )}
                      style={{ width: `${100 / PHASE_ORDER.length}%` }}
                    >
                      {t(PHASE_STATUS_KEYS[phase]!)}
                    </span>
                  );
                })}
              </div>

              {estimatedSeconds !== null && (
                <p className="text-muted-foreground text-xs">
                  {yt("progress.estimated_time", { seconds: estimatedSeconds })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Connection issue banner */}
          {connectionIssue && (
            <p
              className="text-warning-9 bg-warning-3/30 border-warning-6 rounded-lg border px-3 py-2 text-sm"
              role="alert"
            >
              {yt("errors.polling_connection")}
            </p>
          )}

          {/* Cancel button */}
          <div className="flex justify-center gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  {yt("actions.cancel")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>{yt("actions.cancel_confirm_title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {yt("actions.cancel_confirm_description")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{yt("actions.back")}</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleCancel}>
                    {yt("actions.cancel")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* READY: Thread result */}
      {status === "ready" && threadResult && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-1.5"
              onClick={handleReset}
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {yt("actions.back")}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRegenerate}>
              <RefreshCw className="h-4 w-4" />
              {yt("result.regenerate")}
            </Button>
          </div>

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
            onSendToComposer={handleSendToComposer}
            isSendingToComposer={imageStatus === "generating"}
          />
        </div>
      )}

      {/* FAILED: Error with retry */}
      {status === "failed" && (
        <div className="space-y-5">
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
        <Card className="border-destructive/30 bg-destructive/5">
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
