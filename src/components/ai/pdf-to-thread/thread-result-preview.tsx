"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Copy, Send, Check, ExternalLink, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────

interface TweetData {
  text: string;
  charCount: number;
}

interface ThreadResultPreviewProps {
  tweets: TweetData[];
  title: string;
  sourceLanguage?: string;
  redactions?: number;
  transcript?: string;
  transcriptLabel?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  videoUrlLabel?: string;
  meta?: {
    durationLabel?: string;
    provider?: string;
    language?: string;
    generatedInSeconds?: number;
  };
  onSendToComposer?: () => void;
  isSendingToComposer?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────

export function ThreadResultPreview({
  tweets,
  title,
  sourceLanguage,
  redactions,
  transcript,
  transcriptLabel,
  thumbnailUrl,
  videoUrl,
  videoUrlLabel,
  meta,
  onSendToComposer,
  isSendingToComposer,
}: ThreadResultPreviewProps) {
  const t = useTranslations("ai_hub");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="text-foreground text-lg font-bold">{t("pdf_to_thread.result.title")}</h2>
          <p className="text-muted-foreground truncate text-sm">
            {title} &middot; {t("pdf_to_thread.result.tweets_count", { count: tweets.length })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sourceLanguage && (
            <Badge variant="outline" className="text-xs">
              {t("pdf_to_thread.result.source_language")}:{" "}
              {sourceLanguage === "ar"
                ? t("pdf_to_thread.options.language_ar")
                : t("pdf_to_thread.options.language_en")}
            </Badge>
          )}
          {redactions !== undefined && redactions > 0 && (
            <Badge variant="outline" className="border-warning-6 text-warning-9 text-xs">
              {t("pdf_to_thread.result.redactions_notice")}
            </Badge>
          )}
        </div>
      </div>

      {/* Redactions notice */}
      {redactions !== undefined && redactions > 0 && (
        <p className="text-warning-9 bg-warning-3/30 border-warning-6 rounded-lg border px-3 py-2 text-xs">
          {t("pdf_to_thread.result.redactions_notice")}
        </p>
      )}

      {(thumbnailUrl || videoUrl) && (
        <div className="bg-muted/30 flex items-center gap-3 rounded-lg border p-2.5">
          {thumbnailUrl && (
            <Image
              src={thumbnailUrl}
              alt=""
              width={80}
              height={48}
              className="shrink-0 rounded object-cover"
            />
          )}
          {videoUrl && videoUrlLabel && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {videoUrlLabel}
            </a>
          )}
        </div>
      )}

      {/* Tweet cards */}
      <Card>
        <CardContent className="divide-y p-0">
          {tweets.map((tweet, idx) => (
            <TweetCard key={idx} tweet={tweet} index={idx} />
          ))}
        </CardContent>
      </Card>

      {/* Transcript collapsible */}
      {transcript && (
        <details className="bg-muted/40 rounded-lg border px-4 py-3">
          <summary className="text-muted-foreground cursor-pointer text-sm font-medium select-none">
            {transcriptLabel ?? "Show transcript"}
          </summary>
          <p className="text-muted-foreground mt-2 max-h-48 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap">
            {transcript}
          </p>
        </details>
      )}

      {meta &&
        (meta.durationLabel ||
          meta.provider ||
          meta.language ||
          meta.generatedInSeconds !== undefined) && (
          <p className="text-muted-foreground text-xs">
            {[
              meta.durationLabel,
              meta.provider,
              meta.language,
              meta.generatedInSeconds !== undefined ? `${meta.generatedInSeconds}s` : undefined,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <CopyThreadButton tweets={tweets} />
        {onSendToComposer && (
          <Button
            onClick={onSendToComposer}
            size="sm"
            className="gap-2"
            disabled={isSendingToComposer}
          >
            {isSendingToComposer ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSendingToComposer
              ? t("pdf_to_thread.options.include_first_tweet_image_generating")
              : t("pdf_to_thread.result.send_to_composer")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── CopyThreadButton sub-component ─────────────────────────────────────

function CopyThreadButton({ tweets }: { tweets: TweetData[] }) {
  const t = useTranslations("ai_hub");
  const [copied, setCopied] = useState(false);

  const handleCopyAll = useCallback(async () => {
    try {
      const fullThread = tweets.map((tw, i) => `${i + 1}/ ${tw.text}`).join("\n\n");
      await navigator.clipboard.writeText(fullThread);
      setCopied(true);
      toast.success(t("pdf_to_thread.result.copied"));
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error(t("pdf_to_thread.errors.generic"));
    }
  }, [tweets, t]);

  return (
    <Button onClick={handleCopyAll} variant="outline" size="sm" className="gap-2">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {t("pdf_to_thread.result.copy_thread")}
    </Button>
  );
}

// ── TweetCard sub-component ────────────────────────────────────────────

function TweetCard({ tweet, index }: { tweet: TweetData; index: number }) {
  const t = useTranslations("ai_hub");
  const ai = useTranslations("ai");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tweet.text);
      setCopied(true);
      toast.success(t("pdf_to_thread.result.copied"));
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error(t("pdf_to_thread.errors.generic"));
    }
  }, [tweet.text, t]);

  return (
    <div className="flex gap-3 px-4 py-3 sm:px-5 sm:py-4">
      {/* Tweet number badge */}
      <div className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
        {index + 1}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-2">
        <p
          dir="auto"
          className={cn(
            "text-foreground text-sm leading-relaxed whitespace-pre-wrap",
            "text-start"
          )}
        >
          {tweet.text}
        </p>

        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-xs tabular-nums",
              tweet.charCount > 280
                ? "text-destructive font-semibold"
                : tweet.charCount >= 240
                  ? "text-warning-9 font-medium"
                  : "text-muted-foreground"
            )}
          >
            {ai("thread_preview.char_count", { n: tweet.charCount })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-7 gap-1.5 px-2 text-xs"
            onClick={handleCopy}
            aria-label={ai("thread_preview.copy_tweet")}
          >
            {copied ? <Check className="text-success-9 h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {ai("thread_preview.copy_tweet")}
          </Button>
        </div>
      </div>
    </div>
  );
}
