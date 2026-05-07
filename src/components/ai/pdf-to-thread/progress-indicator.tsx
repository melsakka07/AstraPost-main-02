"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ── Props ──────────────────────────────────────────────────────────────

interface ProgressIndicatorProps {
  status: "queued" | "processing";
  elapsedSeconds?: number;
}

// ── Component ──────────────────────────────────────────────────────────

export function ProgressIndicator({ status, elapsedSeconds }: ProgressIndicatorProps) {
  const t = useTranslations("ai_hub");

  const label =
    status === "queued"
      ? t("pdf_to_thread.progress.queued")
      : t("pdf_to_thread.progress.processing");

  const statusLabel =
    status === "queued"
      ? t("pdf_to_thread.progress.status_queued")
      : t("pdf_to_thread.progress.status_processing");

  return (
    <Card className="border-brand-6 bg-brand-3/10">
      <CardContent className="flex flex-col items-center gap-4 px-4 py-8 sm:py-10">
        <div className="relative">
          <Loader2
            className={cn(
              "text-brand-9 h-10 w-10 animate-spin",
              status === "processing" && "text-brand-9",
              status === "queued" && "text-muted-foreground"
            )}
            aria-hidden="true"
          />
        </div>

        <div className="space-y-1 text-center" aria-live="polite" aria-atomic="true">
          <p className="text-foreground text-sm font-semibold">{label}</p>
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
              status === "queued" ? "bg-brand-9" : "bg-brand-3"
            )}
          />
          <div className="bg-muted h-0.5 w-8 rounded" />
          <div
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              status === "processing" ? "bg-brand-9 animate-pulse" : "bg-muted"
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
