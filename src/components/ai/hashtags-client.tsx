"use client";

import { useTranslations } from "next-intl";
import { AiQuotaChip } from "@/components/ai/ai-quota-chip";
import { HashtagGenerator } from "@/components/ai/hashtag-generator";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import type { MonthlyAiUsage } from "@/lib/services/ai-quota";

interface HashtagsClientProps {
  aiUsage: MonthlyAiUsage | null;
  imageUsage: MonthlyAiUsage | null;
}

export function HashtagsClient({ aiUsage, imageUsage }: HashtagsClientProps) {
  const t = useTranslations("ai_hub");

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Breadcrumb items={[{ label: t("tools.hashtag_generator.title") }]} className="mb-0" />
        <AiQuotaChip aiUsage={aiUsage} imageUsage={imageUsage} />
      </div>
      <HashtagGenerator />
    </>
  );
}
