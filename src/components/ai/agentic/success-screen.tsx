"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, ListOrdered, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { AgenticTweet } from "@/lib/ai/agentic-types";

interface SuccessScreenProps {
  action: string;
  scheduleDate?: string;
  tweets?: AgenticTweet[];
  onCreateAnother: () => void;
}

export function SuccessScreen({
  action,
  scheduleDate,
  tweets,
  onCreateAnother,
}: SuccessScreenProps) {
  const t = useTranslations("ai_agentic");
  const message =
    action === "post_now"
      ? t("review_screen.post_queued")
      : action === "schedule"
        ? t("review_screen.scheduled_for", { date: scheduleDate ?? "later" })
        : t("review_screen.draft_saved");

  const firstTweet = tweets?.[0];

  return (
    <div className="animate-in fade-in mx-auto max-w-md space-y-6 py-12 text-center duration-300">
      <div className="text-5xl">✨</div>
      <div>
        <h2 className="text-xl font-semibold">{message}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("review_screen.content_ready")}</p>
      </div>
      {firstTweet?.text && (
        <div className="border-border bg-muted/20 mx-auto max-w-xs rounded-xl border p-4 text-start">
          <p className="line-clamp-3 text-sm leading-relaxed break-words whitespace-pre-wrap">
            {firstTweet.text}
            {firstTweet.hashtags.length > 0 && (
              <span className="text-primary">
                {" "}
                {firstTweet.hashtags.map((h) => `#${h}`).join(" ")}
              </span>
            )}
          </p>
          {firstTweet.imageUrl && (
            <div className="mt-2 overflow-hidden rounded-lg">
              <Image
                src={firstTweet.imageUrl}
                alt=""
                width={400}
                height={225}
                className="max-h-32 w-full object-cover"
                loading="lazy"
                unoptimized
              />
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col items-center gap-2">
        <Button onClick={onCreateAnother} className="gap-2">
          <Wand2 className="h-4 w-4" />
          {t("review_screen.create_another")}
        </Button>
        <div className="flex gap-4 text-sm">
          <Link
            href="/dashboard/schedule?view=list"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ListOrdered className="h-3.5 w-3.5" />
            {t("review_screen.view_in_queue")}
          </Link>
          <Link
            href="/dashboard/schedule?view=month"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Calendar className="h-3.5 w-3.5" />
            {t("review_screen.go_to_calendar")}
          </Link>
        </div>
      </div>
    </div>
  );
}
