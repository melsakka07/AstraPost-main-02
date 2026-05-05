"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ArrowLeft, RefreshCw } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { AttestationCheckbox } from "@/components/ai/pdf-to-thread/attestation-checkbox";
import { GenerationOptions } from "@/components/ai/pdf-to-thread/generation-options";
import { PdfDropzone } from "@/components/ai/pdf-to-thread/pdf-dropzone";
import { PdfPreviewCard } from "@/components/ai/pdf-to-thread/pdf-preview-card";
import { ProgressIndicator } from "@/components/ai/pdf-to-thread/progress-indicator";
import { ThreadResultPreview } from "@/components/ai/pdf-to-thread/thread-result-preview";
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

interface TweetData {
  text: string;
  charCount: number;
}

interface ThreadResult {
  tweets: TweetData[];
  title: string;
  sourceLanguage?: string;
  redactions?: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 8_000;
const MAX_CONSECUTIVE_FAILURES = 5;
const MAX_POLL_DURATION_MS = 5 * 60 * 1000; // 5 minutes

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
  const [connectionIssue, setConnectionIssue] = useState(false);

  // Ref to hold the latest jobId for the poller closure
  const jobIdRef = useRef<string | null>(null);
  jobIdRef.current = jobId;

  // Poll resilience refs
  const retryCountRef = useRef(0);
  const pollStartTimeRef = useRef(0);

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
            upgradeModal.openWithContext(data);
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
          upgradeModal.openWithContext(data);
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
          upgradeModal.openWithContext(data);
          setStatus("extracted");
          setErrorMessage(t("pdf_to_thread.errors.upgrade_required"));
          return;
        }

        toast.error(data.error ?? t("pdf_to_thread.errors.generate_failed"));
        setStatus("extracted");
        setErrorMessage(data.error ?? t("pdf_to_thread.errors.generate_failed"));
        return;
      }

      // Successfully queued
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

  // ── Send to composer ───────────────────────────────────────────────

  const handleSendToComposer = useCallback(() => {
    if (!threadResult) return;
    sessionStorage.setItem(
      "composer_payload",
      JSON.stringify({
        tweets: threadResult.tweets.map((t) => t.text),
      })
    );
    router.push("/dashboard/compose?source=pdf-to-thread");
  }, [threadResult, router]);

  // ── Polling (hard rule #10: AbortController + 8s timeout) ──────────

  useEffect(() => {
    if (status !== "queued" && status !== "processing") return;

    const abortRef = { current: null as AbortController | null };
    let active = true;
    retryCountRef.current = 0;
    pollStartTimeRef.current = Date.now();
    setConnectionIssue(false);

    const tick = async () => {
      const currentJobId = jobIdRef.current;
      if (!currentJobId || !active) return;

      // Max-wait timeout check
      if (Date.now() - pollStartTimeRef.current > MAX_POLL_DURATION_MS) {
        setStatus("error");
        setErrorMessage(t("pdf_to_thread.errors.polling_timeout"));
        return;
      }

      // Abort any in-flight request before starting a new one
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const timeoutId = setTimeout(() => ac.abort(), POLL_TIMEOUT_MS);

      try {
        const res = await fetch(`/api/ai/pdf-to-thread/${currentJobId}`, {
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
        } else if (pollStatus === "failed") {
          setStatus("failed");
          setErrorMessage((data.error as string) ?? t("pdf_to_thread.errors.generate_failed"));
        } else if (pollStatus === "processing") {
          setStatus("processing");
        }
        // "queued" stays as-is
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

    const interval = setInterval(tick, POLL_INTERVAL_MS);
    void tick();

    return () => {
      active = false;
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [status, t]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* IDLE state: dropzone + attestation */}
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
            <ArrowLeft className="h-4 w-4" />
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

      {/* ── QUEUED / PROCESSING: Progress indicator ──────────────── */}
      {(status === "queued" || status === "processing") && (
        <div className="space-y-5">
          <ProgressIndicator status={status} />
          {connectionIssue && (
            <p
              className="text-warning-9 bg-warning-3/30 border-warning-6 rounded-lg border px-3 py-2 text-sm"
              role="alert"
            >
              {t("pdf_to_thread.errors.polling_connection")}
            </p>
          )}
          <div className="flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              {t("pdf_to_thread.actions.cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* ── READY: Thread result ─────────────────────────────────── */}
      {status === "ready" && threadResult && (
        <div className="space-y-5">
          {/* Navigation */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-1.5"
            onClick={handleReset}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("pdf_to_thread.actions.upload_new")}
          </Button>

          <ThreadResultPreview
            tweets={threadResult.tweets}
            title={threadResult.title}
            {...(threadResult.sourceLanguage !== undefined && {
              sourceLanguage: threadResult.sourceLanguage,
            })}
            {...(threadResult.redactions !== undefined && { redactions: threadResult.redactions })}
            onSendToComposer={handleSendToComposer}
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
                  {t("pdf_to_thread.errors.generate_failed")}
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
