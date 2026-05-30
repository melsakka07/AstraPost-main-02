"use client";

import { GripVertical, ImageIcon, Pencil, RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { XAccountAvatar } from "@/components/ai/agentic/x-account-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { AgenticTweet } from "@/lib/ai/agentic-types";
import type { XSubscriptionTier } from "@/lib/schemas/common";
import { computeTweetCharCount } from "@/lib/tweet-char";

interface AgenticTweetCardProps {
  tweet: AgenticTweet;
  index: number;
  total: number;
  isEditing: boolean;
  isRewriting: boolean;
  editText: string;
  setEditText: (v: string) => void;
  username?: string | undefined;
  profileImageUrl?: string | null | undefined;
  subscriptionTier?: XSubscriptionTier | undefined;
  onEditStart: () => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onRewrite: () => void;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function AgenticTweetCard({
  tweet,
  index,
  total,
  isEditing,
  isRewriting,
  editText,
  setEditText,
  username,
  profileImageUrl,
  subscriptionTier,
  onEditStart,
  onEditSave,
  onEditCancel,
  onRewrite,
  onRemove,
  dragHandleProps,
}: AgenticTweetCardProps) {
  const t = useTranslations("ai_agentic");
  // While editing, weight the live text; otherwise use the pipeline's precomputed
  // count. Threads cap at 280; "near limit" warns from 260/280.
  const counts = isEditing
    ? computeTweetCharCount(editText, { isThreadMode: true, warnRatio: 260 / 280 })
    : computeTweetCharCount("", {
        isThreadMode: true,
        precomputedCharCount: tweet.charCount,
        warnRatio: 260 / 280,
      });
  const charCount = counts.charCount;
  const isOverLimit = counts.severity === "over";
  const isNearLimit = counts.severity === "warning";

  return (
    <Card
      role="article"
      aria-label={`Tweet ${index + 1} of ${total}`}
      className={`relative transition-shadow hover:shadow-sm ${isRewriting ? "opacity-60" : ""}`}
    >
      <CardContent className="space-y-3 px-4 pt-4 pb-3">
        {/* Card header */}
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            {dragHandleProps && (
              <button
                type="button"
                aria-label="Drag to reorder tweet"
                className="text-muted-foreground/70 hover:text-muted-foreground focus-visible:ring-ring min-h-[44px] min-w-[44px] cursor-grab touch-none rounded p-2 transition-colors focus-visible:ring-2 active:cursor-grabbing"
                {...dragHandleProps}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}
            <XAccountAvatar
              username={username}
              profileImageUrl={profileImageUrl}
              subscriptionTier={subscriptionTier}
              size="sm"
              showBadge
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-muted-foreground/60">
              {index + 1}/{total}
            </span>
            <span
              className={
                isOverLimit
                  ? "text-destructive font-medium"
                  : isNearLimit
                    ? "text-warning-9 font-medium"
                    : ""
              }
            >
              {charCount}/280
            </span>
          </div>
        </div>

        {/* Tweet body */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[80px] resize-none text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={onEditSave}>
                {t("review_screen.save_draft")}
              </Button>
              <Button size="sm" variant="ghost" onClick={onEditCancel}>
                {t("dialogs.cancel_button")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
            {tweet.text}
            {tweet.hashtags.length > 0 && (
              <span className="text-primary"> {tweet.hashtags.map((h) => `#${h}`).join(" ")}</span>
            )}
          </div>
        )}

        {/* Image */}
        {tweet.imageUrl && (
          <div className="border-border group relative overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tweet.imageUrl}
              alt={tweet.imagePrompt ?? "AI generated image"}
              className="max-h-64 w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-colors group-hover:bg-black/30 group-hover:opacity-100">
              <button
                className="bg-background/90 hover:bg-background flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium"
                onClick={onRewrite}
              >
                <ImageIcon className="h-3 w-3" />
                {t("review_screen.new_image")}
              </button>
            </div>
          </div>
        )}
        {tweet.hasImage && !tweet.imageUrl && (
          <div className="border-border bg-muted/30 text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center text-xs">
            <ImageIcon className="text-muted-foreground/40 h-5 w-5" />
            <span>{t("review_screen.image_failed")}</span>
            <button className="text-primary underline hover:no-underline" onClick={onRewrite}>
              {t("review_screen.retry")}
            </button>
          </div>
        )}

        {/* Action row */}
        {!isEditing && (
          <div className="flex gap-1 pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground h-7 gap-1 text-xs"
              onClick={onEditStart}
            >
              <Pencil className="h-3 w-3" />
              {t("review_screen.edit")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground h-7 gap-1 text-xs"
              onClick={onRewrite}
              disabled={isRewriting}
            >
              <RefreshCw className={`h-3 w-3 ${isRewriting ? "animate-spin" : ""}`} />
              {isRewriting ? t("review_screen.rewriting") : t("review_screen.rewrite")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive h-7 gap-1 text-xs"
              onClick={onRemove}
            >
              <X className="h-3 w-3" />
              {t("review_screen.remove")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
