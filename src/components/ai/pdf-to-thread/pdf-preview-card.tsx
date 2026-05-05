"use client";

import { FileText, CheckCircle2, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// ── Props ──────────────────────────────────────────────────────────────

interface PdfPreviewCardProps {
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  charCount: number;
  syncEligible: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCharCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

// ── Component ──────────────────────────────────────────────────────────

export function PdfPreviewCard({
  fileName,
  fileSizeBytes,
  pageCount,
  charCount,
  syncEligible,
}: PdfPreviewCardProps) {
  const t = useTranslations("ai_hub");

  return (
    <Card className="border-brand-6 bg-brand-3/20">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: icon + file info */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-brand-3 text-brand-9 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-foreground truncate text-sm font-semibold">{fileName}</p>
            <p className="text-muted-foreground text-xs">
              <span dir="ltr">{formatFileSize(fileSizeBytes)}</span> &middot;{" "}
              <span dir="ltr">{t("pdf_to_thread.preview.pages", { count: pageCount })}</span>{" "}
              &middot;{" "}
              <span dir="ltr">
                {t("pdf_to_thread.preview.characters", { count: formatCharCount(charCount) })}
              </span>
            </p>
          </div>
        </div>

        {/* Right: eligibility badge */}
        {syncEligible ? (
          <Badge
            variant="outline"
            className="border-success-6 text-success-9 bg-success-3/30 flex w-fit shrink-0 items-center gap-1.5"
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>{t("pdf_to_thread.preview.sync_eligible")}</span>
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-warning-6 text-warning-9 bg-warning-3/30 flex w-fit shrink-0 items-center gap-1.5"
          >
            <Clock className="h-3 w-3" />
            <span>{t("pdf_to_thread.preview.async_eligible")}</span>
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
