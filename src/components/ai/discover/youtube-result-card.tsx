"use client";

import Link from "next/link";
import Image from "next/image";
import { Eye, Clock, ArrowRight, AlertTriangle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { YouTubeSearchResult } from "@/lib/schemas/youtube-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface YoutubeResultCardProps {
  result: YouTubeSearchResult;
  /** User's plan cap in seconds. `Infinity` or `-1` = unlimited (never warn). */
  maxYoutubeDurationSeconds: number;
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function YoutubeResultCard({ result, maxYoutubeDurationSeconds }: YoutubeResultCardProps) {
  const t = useTranslations("ai_discovery");
  const locale = useLocale();

  // Unlimited sentinel can be Infinity OR -1 (see memory: unlimited sentinel leak).
  const isUnlimited =
    maxYoutubeDurationSeconds === -1 || !Number.isFinite(maxYoutubeDurationSeconds);
  const exceedsLimit = !isUnlimited && result.durationSeconds > maxYoutubeDurationSeconds;

  const compactViews = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(result.viewCount);

  const publishedLabel = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(result.publishedAt));

  const planLimitMinutes = isUnlimited ? 0 : Math.round(maxYoutubeDurationSeconds / 60);

  const convertHref = `/dashboard/ai/youtube-to-thread?url=${encodeURIComponent(result.url)}`;

  return (
    <Card className="hover:border-primary/40 flex h-full flex-col overflow-hidden transition-colors">
      <div className="bg-muted relative aspect-video w-full overflow-hidden">
        <Image
          src={result.thumbnailUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
        <span className="bg-background/85 text-foreground absolute end-1.5 bottom-1.5 flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {formatDuration(result.durationSeconds)}
        </span>
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-foreground line-clamp-2 text-sm leading-snug font-semibold">
          {result.title}
        </p>
        <p className="text-muted-foreground truncate text-xs">{result.channelTitle}</p>

        <div className="text-muted-foreground mt-auto flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 tabular-nums">
            <Eye className="h-3 w-3" aria-hidden="true" />
            {t("views_count", { count: compactViews })}
          </span>
          <span className="truncate">{publishedLabel}</span>
        </div>

        {exceedsLimit ? (
          <div className="mt-1 space-y-1.5">
            <Badge
              variant="outline"
              className="border-warning-9/40 bg-warning-3 text-warning-11 flex w-fit items-center gap-1 px-1.5 py-0 text-[10px]"
            >
              <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
              {t("duration_exceeds_badge")}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block w-full" tabIndex={0}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5"
                      disabled
                      aria-disabled="true"
                    >
                      {t("convert_to_thread")}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {t("duration_exceeds_tooltip", { minutes: planLimitMinutes })}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <Button asChild variant="outline" size="sm" className="mt-1 w-full gap-1.5">
            <Link href={convertHref}>
              {t("convert_to_thread")}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
