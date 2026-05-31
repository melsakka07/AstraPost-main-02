"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, ArrowLeft, RefreshCw, History, ChevronRight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { AttestationCheckbox } from "@/components/ai/pdf-to-thread/attestation-checkbox";
import { GenerationOptions } from "@/components/ai/pdf-to-thread/generation-options";
import { PdfDropzone } from "@/components/ai/pdf-to-thread/pdf-dropzone";
import { PdfPreviewCard } from "@/components/ai/pdf-to-thread/pdf-preview-card";
import { AiResultActions } from "@/components/ai/shared/ai-result-actions";
import { JobProgressCard } from "@/components/ai/shared/job-progress-card";
import { ThreadResultPreview } from "@/components/ai/shared/thread-result-preview";
import type { TweetData, ThreadResult } from "@/components/ai/shared/types";
import { useJobPolling } from "@/components/ai/shared/use-job-polling";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";

// ── Types ──────────────────────────────────────────────────────────────

type FlowStatus =
  | "idle"
  | "uploading"
  | "extracted"
  | "generating"
  | "queued"
  | "processing"
  | "ready"
  | "failed"
  | "error";

interface RecentJob {
  id: string;
  fileName: string;
  pageCount: number | null;
  title: string;
  completedAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────

const ERROR_CODE_I18N_KEYS: Record<string, string> = {
  PDF_NO_TEXT_LAYER: "pdf_to_thread.errors.pdf_no_text",
  PDF_PARSE_FAILED: "pdf_to_thread.errors.pdf_parse_failed",
  PDF_TOO_LARGE: "pdf_to_thread.dropzone.file_too_large",
  PDF_TOO_MANY_PAGES: "pdf_to_thread.errors.pdf_no_text",
  ATTESTATION_REQUIRED: "pdf_to_thread.errors.attestation_required",
  NOT_A_PDF: "pdf_to_thread.dropzone.not_valid_pdf",
  USE_ASYNC_PATH: "pdf_to_thread.errors.generate_failed",
};

// ── Component ──────────────────────────────────────────────────────────

export function PdfToThreadClient() {
  const t = useTranslations("ai_hub");
  const router = useRouter();
  const upgradeModal = useUpgradeModal();

  // ── State ──────────────────────────────────────────────────────────

  const [status, setStatus] = useState<FlowStatus>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [fileSizeBytes, setFileSizeBytes] = useState(0);
  const [syncEligible, setSyncEligible] = useState(false);
  const [threadResult, setThreadResult] = useState<ThreadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [tweetCount, setTweetCount] = useState(7);
  const [tone, setTone] = useState("professional");
  const locale = useLocale();
  const [language, setLanguage] = useState<"ar" | "en">(locale === "ar" ? "ar" : "en");
  const [attestationChecked, setAttestationChecked] = useState(false);
  const [attestationError, setAttestationError] = useState("");
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);

  // First-tweet image generation
  const [includeFirstTweetImage, setIncludeFirstTweetImage] = useState(false);
  const [firstTweetImageUrl, setFirstTweetImageUrl] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [imageQuotaExhausted, setImageQuotaExhausted] = useState(false);
  const imageAbortRef = useRef<AbortController | null>(null);

  const searchParams = useSearchParams();

  // Regenerate: store last used params
  const lastParamsRef = useRef<{
    language: "ar" | "en";
    tweetCount: number;
    tone: string;
  } | null>(null);

  // ── Cleanup image abort on unmount ──────────────────────────────────

  useEffect(() => {
    return () => {
      imageAbortRef.current?.abort();
    };
  }, []);

  // ── Recent jobs fetch ───────────────────────────────────────────────

  useEffect(() => {
    if (status !== "idle") return;
    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), 8_000);
    fetch("/api/ai/pdf-to-thread/history", { signal: ac.signal })
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

  // ── State recovery from URL (?jobId=) ──────────────────────────────

  useEffect(() => {
    const urlJobId = searchParams.get("jobId");
    if (!urlJobId || status !== "idle") return;

    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), 8_000);

    fetch(`/api/ai/pdf-to-thread/${urlJobId}`, { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const jobStatus = data.status as string;
        if (jobStatus === "ready" && data.threadResult) {
          setJobId(urlJobId);
          setFileName((data.fileName as string) ?? "");
          setCharCount((data.charCount as number) ?? 0);
          setPageCount((data.pageCount as number) ?? 0);
          setThreadResult({
            tweets: (data.threadResult as { tweets: TweetData[] }).tweets ?? [],
            title: (data.threadResult as { title?: string })?.title ?? "",
            ...(data.threadResult &&
            typeof data.threadResult === "object" &&
            "sourceLanguage" in data.threadResult
              ? { sourceLanguage: (data.threadResult as { sourceLanguage: string }).sourceLanguage }
              : {}),
          });
          setStatus("ready");
        } else if (jobStatus === "failed") {
          setJobId(urlJobId);
          setStatus("failed");
          setErrorMessage((data.error as string) ?? t("pdf_to_thread.errors.generate_failed"));
          setErrorCode((data.errorCode as string) ?? undefined);
        }
      })
      .catch(() => {});
    return () => {
      clearTimeout(timeoutId);
      ac.abort();
    };
  }, [searchParams, status, t]);

  // ── Reset ──────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStatus("idle");
    setJobId(null);
    setCharCount(0);
    setPageCount(0);
    setFileName("");
    setFileSizeBytes(0);
    setSyncEligible(false);
    setThreadResult(null);
    setErrorMessage("");
    setAttestationChecked(false);
    setAttestationError("");
    setErrorCode(undefined);
    setFirstTweetImageUrl(null);
    setImageStatus("idle");
  }, []);

  // ── Upload handler ─────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (file: File) => {
      setStatus("uploading");
      setErrorMessage("");

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("language", language);
        formData.append("tweetCount", String(tweetCount));
        formData.append("tone", tone);
        formData.append("attestation", String(attestationChecked));

        const res = await fetch("/api/ai/pdf-to-thread/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          // 402 plan limit
          if (res.status === 402) {
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
            setStatus("error");
            setErrorMessage(t("pdf_to_thread.errors.upgrade_required"));
            return;
          }

          const code = data.code as string | undefined;
          if (code === "ATTESTATION_REQUIRED") {
            setAttestationError(t("pdf_to_thread.errors.attestation_required"));
            setStatus("idle");
            return;
          }
          if (code === "PDF_NO_TEXT_LAYER") {
            toast.error(t("pdf_to_thread.errors.pdf_no_text"));
            setStatus("idle");
            return;
          }
          if (code === "PDF_PARSE_FAILED") {
            toast.error(t("pdf_to_thread.errors.pdf_parse_failed"));
            setStatus("idle");
            return;
          }
          if (code === "PDF_TOO_MANY_PAGES") {
            toast.error(data.error as string);
            setStatus("idle");
            return;
          }
          if (res.status === 429) {
            toast.error(t("pdf_to_thread.errors.rate_limited"));
            setStatus("idle");
            return;
          }

          toast.error(data.error ?? t("pdf_to_thread.errors.upload_failed"));
          setStatus("error");
          setErrorMessage(data.error ?? t("pdf_to_thread.errors.upload_failed"));
          return;
        }

        // Success
        setJobId(data.jobId as string);
        setCharCount(data.charCount as number);
        setPageCount(data.pageCount as number);
        setSyncEligible(data.syncEligible as boolean);
        setFileName(data.fileName as string);
        setFileSizeBytes(file.size);
        setStatus("extracted");
        lastParamsRef.current = { language, tweetCount, tone };
        toast.success(t("pdf_to_thread.dropzone.upload_success") as string);
      } catch (err) {
        if (err instanceof TypeError) {
          toast.error(t("pdf_to_thread.errors.upload_failed"));
        }
        setStatus("error");
        setErrorMessage(t("pdf_to_thread.errors.upload_failed"));
      }
    },
    [language, tweetCount, tone, attestationChecked, upgradeModal, t]
  );

  // ── Sync generate handler ──────────────────────────────────────────

  const handleSyncGenerate = useCallback(async () => {
    if (!attestationChecked) {
      setAttestationError(t("pdf_to_thread.attestation.required_error"));
      return;
    }
    setAttestationError("");

    if (!jobId) return;
    setStatus("generating");
    setErrorMessage("");

    try {
      const res = await fetch("/api/ai/pdf-to-thread/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, language, tweetCount, tone }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
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
          setStatus("extracted");
          setErrorMessage(t("pdf_to_thread.errors.upgrade_required"));
          return;
        }

        toast.error(data.error ?? t("pdf_to_thread.errors.generate_failed"));
        setStatus("extracted");
        setErrorMessage(data.error ?? t("pdf_to_thread.errors.generate_failed"));
        return;
      }

      // Success — map API response to internal shape
      const tweets: TweetData[] = Array.isArray(data.tweets)
        ? data.tweets.map((t: string | TweetData) =>
            typeof t === "string" ? { text: t, charCount: t.length } : t
          )
        : [];

      const sourceLanguage = (data.sourceLanguage as string | undefined) ?? undefined;
      setThreadResult({
        tweets,
        title: (data.title as string) ?? fileName,
        ...(sourceLanguage !== undefined && { sourceLanguage }),
        ...(data.redactions !== undefined && { redactions: (data.redactions as unknown[]).length }),
      });
      setStatus("ready");
      toast.success(t("pdf_to_thread.result.generated_success") as string);
    } catch {
      setStatus("extracted");
      setErrorMessage(t("pdf_to_thread.errors.generate_failed"));
      toast.error(t("pdf_to_thread.errors.generate_failed"));
    }
  }, [attestationChecked, jobId, language, tweetCount, tone, upgradeModal, t, fileName]);

  // ── Async enqueue handler ──────────────────────────────────────────

  const handleAsyncEnqueue = useCallback(async () => {
    if (!attestationChecked) {
      setAttestationError(t("pdf_to_thread.attestation.required_error"));
      return;
    }
    setAttestationError("");

    if (!jobId) return;
    setStatus("generating");
    setErrorMessage("");

    try {
      const res = await fetch("/api/ai/pdf-to-thread/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
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
          setStatus("extracted");
          setErrorMessage(t("pdf_to_thread.errors.upgrade_required"));
          return;
        }

        toast.error(data.error ?? t("pdf_to_thread.errors.generate_failed"));
        setStatus("extracted");
        setErrorMessage(data.error ?? t("pdf_to_thread.errors.generate_failed"));
        return;
      }

      // Successfully queued — polling will start via the shared hook
      setStatus("queued");
    } catch {
      setStatus("extracted");
      setErrorMessage(t("pdf_to_thread.errors.generate_failed"));
      toast.error(t("pdf_to_thread.errors.generate_failed"));
    }
  }, [attestationChecked, jobId, upgradeModal, t]);

  // ── Cancel handler ─────────────────────────────────────────────────

  const handleCancel = useCallback(async () => {
    if (!jobId) return;
    try {
      await fetch(`/api/ai/pdf-to-thread/${jobId}`, { method: "DELETE" });
    } catch {
      // Best-effort cancel
    }
    handleReset();
  }, [jobId, handleReset]);

  // ── Regenerate handler ──────────────────────────────────────────────

  const handleRegenerate = useCallback(() => {
    const params = lastParamsRef.current;
    if (!params) {
      handleReset();
      return;
    }
    setLanguage(params.language);
    setTweetCount(params.tweetCount);
    setTone(params.tone);
    // Re-trigger the original flow: we need the file re-uploaded
    handleReset();
  }, [handleReset]);

  // ── Recent job click handler ───────────────────────────────────────

  const handleRecentJobClick = useCallback(
    async (clickedJobId: string) => {
      try {
        const res = await fetch(`/api/ai/pdf-to-thread/${clickedJobId}`);
        if (!res.ok) {
          toast.error(t("pdf_to_thread.errors.generate_failed"));
          return;
        }
        const data = await res.json();
        const result = data.threadResult as ThreadResult | null;
        if (result) {
          setThreadResult({
            tweets: result.tweets ?? [],
            title: result.title ?? "",
            ...(result.sourceLanguage !== undefined && { sourceLanguage: result.sourceLanguage }),
          });
          setJobId(clickedJobId);
          setFileName((data.fileName as string) ?? "");
          setStatus("ready");
        }
      } catch {
        toast.error(t("pdf_to_thread.errors.generate_failed"));
      }
    },
    [t]
  );

  // ── Send to composer ───────────────────────────────────────────────

  const handleSendToComposer = useCallback(async () => {
    if (!threadResult) return;

    let imageUrl = firstTweetImageUrl;

    // If toggle is on and image not yet generated, generate it first
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
          body: JSON.stringify({ prompt, source: "pdf-to-thread" }),
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
          toast.error(t("pdf_to_thread.options.include_first_tweet_image_failed"));
          setImageStatus("error");
          return;
        }

        const data = await res.json();
        imageUrl = data.url as string;
        setFirstTweetImageUrl(imageUrl);
        setImageStatus("ready");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        toast.error(t("pdf_to_thread.options.include_first_tweet_image_failed"));
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
        source: "pdf-to-thread",
        ...(imageUrl && { firstTweetImage: { url: imageUrl } }),
      })
    );
    router.push("/dashboard/compose?source=pdf-to-thread");
  }, [
    threadResult,
    router,
    includeFirstTweetImage,
    firstTweetImageUrl,
    imageStatus,
    upgradeModal,
    t,
  ]);

  // ── Polling (shared hook) ───────────────────────────────────────────

  const isProgressPhase = status === "queued" || status === "processing";

  const { elapsedSeconds, connectionIssue } = useJobPolling({
    jobId,
    pollEndpoint: "/api/ai/pdf-to-thread",
    isProgressPhase,
    onReady: (data) => {
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
          ...(result.sourceLanguage !== undefined && { sourceLanguage: result.sourceLanguage }),
        });
      }
    },
    onFailed: (error, code) => {
      setStatus("failed");
      setErrorMessage(error ?? t("pdf_to_thread.errors.generate_failed"));
      setErrorCode(code ?? undefined);
    },
    onStatusChange: (newStatus) => {
      if (newStatus === "processing") setStatus("processing");
      // "queued" stays as-is (already set by handleAsyncEnqueue)
    },
  });

  // ── Computed labels for JobProgressCard ─────────────────────────────

  const statusLabel =
    status === "queued"
      ? t("pdf_to_thread.progress.queued")
      : t("pdf_to_thread.progress.processing");

  const elapsedLabel = t("pdf_to_thread.progress.elapsed", { seconds: elapsedSeconds });

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* IDLE state: dropzone + attestation + recent jobs */}
      {status === "idle" && (
        <div className="space-y-5">
          <PdfDropzone onFileSelected={handleUpload} disabled={false} />
          <AttestationCheckbox
            checked={attestationChecked}
            onChange={(val) => {
              setAttestationChecked(val);
              if (val) setAttestationError("");
            }}
            error={attestationError}
          />
          {recentJobs.length > 0 && (
            <Card>
              <CardContent className="px-4 py-4">
                <div className="mb-3 flex items-center gap-2">
                  <History className="text-muted-foreground h-4 w-4" />
                  <p className="text-muted-foreground text-sm font-medium">
                    {t("pdf_to_thread.recent.title")}
                  </p>
                </div>
                <div className="divide-y">
                  {recentJobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      className="hover:bg-muted/50 flex w-full items-center gap-3 px-1 py-2.5 text-start transition-colors"
                      onClick={() => handleRecentJobClick(job.id)}
                    >
                      <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded">
                        <FileText className="text-muted-foreground h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm">
                          {job.title || job.fileName || t("pdf_to_thread.recent.untitled")}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {job.pageCount != null &&
                            `${t("pdf_to_thread.preview.pages", { count: job.pageCount })} · `}
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

      {/* UPLOADING state: disabled dropzone + attestation */}
      {status === "uploading" && (
        <div className="space-y-5">
          <PdfDropzone onFileSelected={handleUpload} disabled={true} />
          <AttestationCheckbox
            checked={attestationChecked}
            onChange={(val) => {
              setAttestationChecked(val);
              if (val) setAttestationError("");
            }}
            error={attestationError}
            disabled={true}
          />
        </div>
      )}

      {/* ── EXTRACTED: Preview + Options + Attestation + Actions ── */}
      {(status === "extracted" || status === "generating") && (
        <div className="space-y-5">
          {/* Navigation */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-1.5"
            onClick={handleReset}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t("pdf_to_thread.actions.upload_new")}
          </Button>

          {/* Preview card */}
          <PdfPreviewCard
            fileName={fileName}
            fileSizeBytes={fileSizeBytes}
            pageCount={pageCount}
            charCount={charCount}
            syncEligible={syncEligible}
          />

          {/* Options */}
          <GenerationOptions
            language={language}
            onLanguageChange={setLanguage}
            tweetCount={tweetCount}
            onTweetCountChange={setTweetCount}
            tone={tone}
            onToneChange={setTone}
            includeFirstTweetImage={includeFirstTweetImage}
            onIncludeFirstTweetImageChange={setIncludeFirstTweetImage}
            imageQuotaExhausted={imageQuotaExhausted}
            disabled={status === "generating"}
          />

          {/* Error */}
          {errorMessage && (
            <p
              className="text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-sm"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {syncEligible ? (
              <Button
                onClick={handleSyncGenerate}
                disabled={status === "generating"}
                className="gap-2"
              >
                {status === "generating" ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t("pdf_to_thread.actions.generate_sync")}
                  </>
                ) : (
                  t("pdf_to_thread.actions.generate_sync")
                )}
              </Button>
            ) : (
              <Button
                onClick={handleAsyncEnqueue}
                disabled={status === "generating"}
                className="gap-2"
              >
                {status === "generating" ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t("pdf_to_thread.actions.enqueue_async")}
                  </>
                ) : (
                  t("pdf_to_thread.actions.enqueue_async")
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── QUEUED / PROCESSING: Shared progress card ──────────────── */}
      {(status === "queued" || status === "processing") && (
        <JobProgressCard
          statusLabel={statusLabel}
          elapsedLabel={elapsedLabel}
          phases={[]}
          currentPhaseIndex={-1}
          estimatedSeconds={null}
          estimatedTimeLabel=""
          connectionIssue={connectionIssue}
          connectionIssueLabel={t("pdf_to_thread.errors.polling_connection")}
          onCancel={handleCancel}
          cancelLabel={t("pdf_to_thread.actions.cancel")}
          backLabel={t("pdf_to_thread.actions.back")}
          cancelConfirmTitle={t("pdf_to_thread.actions.cancel_confirm_title")}
          cancelConfirmDescription={t("pdf_to_thread.actions.cancel_confirm_description")}
          spinnerMuted={status === "queued"}
        />
      )}

      {/* ── READY: Thread result ─────────────────────────────────── */}
      {status === "ready" && threadResult && (
        <div className="space-y-5">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-1.5"
            onClick={handleReset}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t("pdf_to_thread.actions.upload_new")}
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
            {...(threadResult.redactions !== undefined && { redactions: threadResult.redactions })}
          />
        </div>
      )}

      {/* ── FAILED: Error with retry ─────────────────────────────── */}
      {status === "failed" && (
        <div className="space-y-5">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-col items-center gap-4 px-4 py-8 text-center">
              <FileText className="text-destructive h-10 w-10" />
              <div className="space-y-1">
                <p className="text-foreground text-sm font-semibold">
                  {errorCode && ERROR_CODE_I18N_KEYS[errorCode]
                    ? t(ERROR_CODE_I18N_KEYS[errorCode]!)
                    : t("pdf_to_thread.errors.generate_failed")}
                </p>
                {errorMessage && <p className="text-muted-foreground text-xs">{errorMessage}</p>}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  {t("pdf_to_thread.actions.upload_new")}
                </Button>
                <Button size="sm" onClick={handleReset} className="gap-1.5">
                  <RefreshCw className="h-4 w-4" />
                  {t("pdf_to_thread.actions.retry")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ERROR: Generic error ─────────────────────────────────── */}
      {status === "error" && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-4 px-4 py-8 text-center">
            <FileText className="text-destructive h-10 w-10" />
            <div className="space-y-1">
              <p className="text-foreground text-sm font-semibold">
                {t("pdf_to_thread.errors.generic")}
              </p>
              {errorMessage && <p className="text-muted-foreground text-xs">{errorMessage}</p>}
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              {t("pdf_to_thread.actions.retry")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
