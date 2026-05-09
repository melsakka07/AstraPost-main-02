"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ── Props ──────────────────────────────────────────────────────────────

interface ProgressIndicatorProps {
  status: "queued" | "processing" | "uploading" | "extracting" | "ready" | "failed";
  elapsedSeconds?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────

const LABEL_KEYS: Record<string, string> = {
  uploading: "pdf_to_thread.progress.uploading",
  queued: "pdf_to_thread.progress.queued",
  extracting: "pdf_to_thread.progress.extracting",
  processing: "pdf_to_thread.progress.processing",
  ready: "pdf_to_thread.progress.ready",
  failed: "pdf_to_thread.progress.failed",
};

const STATUS_KEYS: Record<string, string> = {
  uploading: "pdf_to_thread.progress.status_uploading",
  queued: "pdf_to_thread.progress.status_queued",
  extracting: "pdf_to_thread.progress.status_extracting",
  processing: "pdf_to_thread.progress.status_processing",
  ready: "pdf_to_thread.progress.status_ready",
  failed: "pdf_to_thread.progress.status_failed",
};

const ACTIVE_STATUSES = new Set(["uploading", "queued", "extracting", "processing"]);

// ── Component ──────────────────────────────────────────────────────────

export function ProgressIndicator({ status, elapsedSeconds }: ProgressIndicatorProps) {
  const t = useTranslations("ai_hub");
  const label = t(LABEL_KEYS[status] ?? "");
  const statusLabel = t(STATUS_KEYS[status] ?? "");
  const isActive = ACTIVE_STATUSES.has(status);

  return (
    <Card
      className={cn(
        "border-brand-6 bg-brand-3/10",
        status === "failed" && "border-destructive/30 bg-destructive/5"
      )}
    >
      <CardContent className="flex flex-col items-center gap-4 px-4 py-8 sm:py-10">
        {isActive && (
          <div className="relative">
            <Loader2
              className={cn(
                "text-brand-9 h-10 w-10 animate-spin",
                (status === "queued" || status === "uploading") && "text-muted-foreground"
              )}
              aria-hidden="true"
            />
          </div>
        )}

        <div className="space-y-1 text-center" aria-live="polite" aria-atomic="true">
          <p
            className={cn(
              "text-foreground text-sm font-semibold",
              status === "failed" && "text-destructive"
            )}
          >
            {label}
          </p>
          <p className="text-muted-foreground text-xs">
            {t("pdf_to_thread.progress.status")}: <span className="font-medium">{statusLabel}</span>
          </p>
          {elapsedSeconds !== undefined && elapsedSeconds > 0 && (
            <p className="text-muted-foreground text-xs">
              {t("pdf_to_thread.progress.elapsed", { seconds: elapsedSeconds })}
            </p>
          )}
        </div>

        {/* Visual phase dots */}
        <div className="flex items-center gap-2" aria-hidden="true">
          <div
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              status !== "ready" && status !== "failed" ? "bg-brand-9" : "bg-brand-3"
            )}
          />
          <div className="bg-muted h-0.5 w-8 rounded" />
          <div
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              status === "processing" ||
                status === "extracting" ||
                status === "ready" ||
                status === "failed"
                ? status === "failed"
                  ? "bg-destructive"
                  : "bg-brand-9"
                : "bg-muted",
              (status === "processing" || status === "extracting") && "animate-pulse"
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
