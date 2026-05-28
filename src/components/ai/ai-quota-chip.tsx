"use client";

import Link from "next/link";
import { Sparkles, Image as ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MonthlyAiUsage } from "@/lib/services/ai-quota";

interface AiQuotaChipProps {
  aiUsage: MonthlyAiUsage | null;
  imageUsage: MonthlyAiUsage | null;
}

export function AiQuotaChip({ aiUsage, imageUsage }: AiQuotaChipProps) {
  const t = useTranslations("ai_writer");

  const formatQuota = (used: number, limit: number | null): string => {
    if (limit === null || limit === -1) return `${used} / ${t("quota.unlimited")}`;
    return `${used} / ${limit}`;
  };

  const aiLabel = aiUsage ? formatQuota(aiUsage.used, aiUsage.limit) : "—";
  const imageLabel = imageUsage ? formatQuota(imageUsage.used, imageUsage.limit) : "—";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/dashboard/settings/billing"
          className="border-border bg-background text-muted-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors"
        >
          <Sparkles className="text-primary h-3 w-3 shrink-0" />
          <span className="tabular-nums">{aiLabel}</span>
          <span className="text-border select-none">|</span>
          <ImageIcon className="h-3 w-3 shrink-0" />
          <span className="tabular-nums">{imageLabel}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {t("quota.view_billing")}
      </TooltipContent>
    </Tooltip>
  );
}
