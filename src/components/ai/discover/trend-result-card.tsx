"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, ArrowRight, ExternalLink, PenLine, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { isValidTweetUrl } from "@/components/inspiration/inspiration-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TrendItem } from "@/lib/schemas/common";

interface TrendResultCardProps {
  trend: TrendItem;
}

/** Derive a stable, storage-safe slug from the trend title. */
function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug.length > 0 ? `trend-${slug}` : "trend";
}

export function TrendResultCard({ trend }: TrendResultCardProps) {
  const t = useTranslations("ai_discovery");
  const router = useRouter();

  const evidenceUrl = trend.evidenceUrl;
  const canImportAdapt = evidenceUrl !== undefined && isValidTweetUrl(evidenceUrl);
  // "View source" may point at any real source (news article, not just a tweet),
  // but only ever render an http(s) href — never a model-emitted javascript:/data: URI.
  const hasSafeEvidenceLink = evidenceUrl !== undefined && /^https?:\/\//i.test(evidenceUrl);

  const handleDraftPost = useCallback(() => {
    // Seed the composer directly with the trend's post-ready angle. The composer
    // bridge (use-composer-bridge.ts) reads all three of these keys; write all
    // three or it renders partial data (R1).
    try {
      sessionStorage.setItem("inspiration_tweets", JSON.stringify([trend.suggestedAngle]));
      sessionStorage.setItem("inspiration_source_id", slugifyTitle(trend.title));
      sessionStorage.setItem(
        "inspiration_attribution",
        JSON.stringify({ handle: "trend", url: evidenceUrl ?? "" })
      );
    } catch {
      // sessionStorage may be unavailable — navigate anyway.
    }
    router.push("/dashboard/compose");
  }, [router, trend.suggestedAngle, trend.title, evidenceUrl]);

  const handleImportAdapt = useCallback(() => {
    if (evidenceUrl === undefined || !isValidTweetUrl(evidenceUrl)) return;
    router.push(`/dashboard/inspiration?url=${encodeURIComponent(evidenceUrl)}`);
  }, [router, evidenceUrl]);

  return (
    <Card className="hover:border-primary/40 flex h-full flex-col overflow-hidden transition-colors">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-foreground line-clamp-2 text-sm leading-snug font-semibold">
            {trend.title}
          </p>
          {hasSafeEvidenceLink && evidenceUrl !== undefined && (
            <a
              href={evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("trend_evidence_link")}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring shrink-0 rounded focus-visible:ring-2 focus-visible:outline-none"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>

        <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
          {trend.description}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-brand-9/40 bg-brand-3 text-brand-11 flex w-fit items-center gap-1 px-1.5 py-0 text-[10px]"
          >
            <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" />
            {t("trend_post_count", { count: trend.postCount })}
          </Badge>
          {trend.category.length > 0 && (
            <Badge variant="secondary" className="w-fit px-1.5 py-0 text-[10px]">
              {trend.category}
            </Badge>
          )}
        </div>

        <div className="bg-muted/50 rounded-md p-2.5">
          <p className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t("trend_suggested_angle")}
          </p>
          <p className="text-foreground line-clamp-3 text-xs leading-relaxed">
            {trend.suggestedAngle}
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <Button size="sm" className="w-full gap-1.5" onClick={handleDraftPost}>
            <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
            {t("trend_draft_post")}
          </Button>
          {canImportAdapt && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={handleImportAdapt}
            >
              {t("trend_import_adapt")}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
