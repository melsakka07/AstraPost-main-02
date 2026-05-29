"use client";

import Link from "next/link";
import {
  CalendarDays,
  FileText,
  Hash,
  Link2,
  Lock,
  MessageCircle,
  PenTool,
  Shuffle,
  UserPen,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";

export type AiToolId =
  | "thread_writer"
  | "url_to_thread"
  | "pdf_to_thread"
  | "youtube_to_thread"
  | "ab_variants"
  | "hashtag_generator"
  | "bio_generator"
  | "reply_generator"
  | "ai_calendar";

interface ToolMeta {
  icon: LucideIcon;
  href: string;
  isPro: boolean;
  feature: string;
}

export const TOOL_META: Record<AiToolId, ToolMeta> = {
  thread_writer: { icon: PenTool, href: "/dashboard/ai/writer", isPro: false, feature: "ai" },
  url_to_thread: {
    icon: Link2,
    href: "/dashboard/ai/writer?tab=url",
    isPro: true,
    feature: "url_to_thread",
  },
  pdf_to_thread: {
    icon: FileText,
    href: "/dashboard/ai/pdf-to-thread",
    isPro: true,
    feature: "pdf_to_thread",
  },
  youtube_to_thread: {
    icon: Youtube,
    href: "/dashboard/ai/youtube-to-thread",
    isPro: true,
    feature: "youtube_to_thread",
  },
  ab_variants: {
    icon: Shuffle,
    href: "/dashboard/ai/writer?tab=variants",
    isPro: true,
    feature: "variants",
  },
  hashtag_generator: {
    icon: Hash,
    href: "/dashboard/ai/writer?tab=hashtags",
    isPro: false,
    feature: "ai",
  },
  bio_generator: { icon: UserPen, href: "/dashboard/ai/bio", isPro: true, feature: "bio" },
  reply_generator: {
    icon: MessageCircle,
    href: "/dashboard/ai/reply",
    isPro: true,
    feature: "reply",
  },
  ai_calendar: {
    icon: CalendarDays,
    href: "/dashboard/ai/calendar",
    isPro: true,
    feature: "calendar",
  },
};

export const TOOL_ORDER: AiToolId[] = [
  "thread_writer",
  "url_to_thread",
  "ab_variants",
  "hashtag_generator",
  "pdf_to_thread",
  "youtube_to_thread",
  "bio_generator",
  "reply_generator",
  "ai_calendar",
];

interface AiToolsGridProps {
  lockedMap: Record<AiToolId, boolean>;
  isQuotaExhausted: boolean;
  userPlan: string;
  trialActive: boolean;
}

export function AiToolsGrid({
  lockedMap,
  isQuotaExhausted,
  userPlan,
  trialActive,
}: AiToolsGridProps) {
  const t = useTranslations("ai_hub");
  const { openWithContext } = useUpgradeModal();

  const handleLockedClick = (toolId: AiToolId, reason: "feature" | "quota") => {
    const meta = TOOL_META[toolId];
    openWithContext({
      feature: meta.feature,
      plan: userPlan,
      code: reason === "quota" ? "quota_exceeded" : "upgrade_required",
      trialActive,
      upgradeUrl: "/dashboard/settings/billing",
      suggestedPlan: "pro_monthly",
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TOOL_ORDER.map((toolId) => {
        const meta = TOOL_META[toolId];
        const Icon = meta.icon;
        const featureLocked = lockedMap[toolId];
        const locked = featureLocked || isQuotaExhausted;
        const lockReason: "feature" | "quota" = featureLocked ? "feature" : "quota";

        const cardInner = (
          <Card className="hover:border-primary/40 hover:bg-muted/40 relative h-full transition-colors">
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="bg-primary/10 group-hover:bg-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors">
                  <Icon className="text-primary h-5 w-5" />
                </div>
                {meta.isPro && !locked && (
                  <Badge
                    variant="outline"
                    className="border-primary/30 text-primary h-4 px-1.5 py-0 text-[10px]"
                  >
                    Pro
                  </Badge>
                )}
                {locked && (
                  <Badge
                    variant="outline"
                    className="border-warning-9/40 bg-warning-3 text-warning-11 dark:text-warning-11 flex h-5 items-center gap-1 px-1.5 py-0 text-[10px]"
                  >
                    <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                    {t("locked_overlay_title")}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <p className="group-hover:text-primary text-sm leading-tight font-semibold transition-colors">
                  {t(`tools.${toolId}.title`)}
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {t(`tools.${toolId}.description`)}
                </p>
                <p className="text-muted-foreground/70 text-[11px] leading-relaxed italic">
                  {t(`tools.${toolId}.capability`)}
                </p>
              </div>
              <p
                className={`mt-auto text-xs font-medium transition-opacity ${
                  locked
                    ? "text-warning-11 dark:text-warning-11 opacity-100"
                    : "text-primary opacity-0 group-hover:opacity-100"
                }`}
              >
                {locked
                  ? lockReason === "quota"
                    ? t("quota_overlay_cta")
                    : t("locked_overlay_cta")
                  : t("try_it")}
              </p>
            </CardContent>
          </Card>
        );

        if (locked) {
          return (
            <button
              key={toolId}
              type="button"
              onClick={() => handleLockedClick(toolId, lockReason)}
              className="group block w-full text-start"
              aria-label={`${t(`tools.${toolId}.title`)} — ${t("locked_overlay_cta")}`}
            >
              {cardInner}
            </button>
          );
        }

        return (
          <Link key={toolId} href={meta.href} className="group block">
            {cardInner}
          </Link>
        );
      })}
    </div>
  );
}
