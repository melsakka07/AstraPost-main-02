"use client";

import { useCallback, useRef, useState } from "react";
import { RefreshCw, Send, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { InboxAiReplyPicker } from "@/components/inbox/inbox-ai-reply-picker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { clientLogger } from "@/lib/client-logger";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { cn } from "@/lib/utils";

const MAX_CHARS = 280;

interface InboxReplyComposerProps {
  itemId: string;
  itemText: string;
  itemAuthor: string;
  onPosted: () => void;
  onClose: () => void;
}

/**
 * Expandable inline reply composer. Supports manual typing and AI-generated
 * reply suggestions via the InboxAiReplyPicker.
 */
export function InboxReplyComposer({
  itemId,
  itemText: _itemText,
  itemAuthor: _itemAuthor,
  onPosted,
  onClose,
}: InboxReplyComposerProps) {
  const t = useTranslations("inbox");
  const [text, setText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [showAiPicker, setShowAiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;

  const handlePost = useCallback(async () => {
    if (isOverLimit || text.trim().length === 0 || isPosting) return;
    setIsPosting(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/inbox/${itemId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const apiError = (body as { error?: string })?.error ?? `Status ${res.status}`;
        throw new Error(apiError, { cause: { status: res.status } });
      }
      setPosted(true);
      setTimeout(() => onPosted(), 1500);
    } catch (err) {
      const status = err instanceof Error ? (err.cause as { status?: number })?.status : undefined;
      clientLogger.error("inbox_reply_post_failed", {
        itemId: itemId || "unknown",
        message: err instanceof Error ? err.message : String(err),
        status: status ?? 0,
      });
      setError(err instanceof Error ? err.message : t("error.replyFailed"));
    } finally {
      setIsPosting(false);
    }
  }, [text, isOverLimit, isPosting, itemId, onPosted, t]);

  const handleAiSelect = useCallback((aiText: string) => {
    setText(aiText);
    setShowAiPicker(false);
    // Focus textarea after filling
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  if (posted) {
    return (
      <div className="bg-success-3 border-success-6 mt-2 rounded-lg border px-4 py-3">
        <p className="text-success-11 text-sm font-medium">{t("composer.posted")}</p>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-3">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("composer.placeholder")}
          className="min-h-[80px] resize-none pr-14 text-sm"
          disabled={isPosting}
          dir="auto"
          aria-label={t("composer.placeholder")}
        />
        <span
          className={cn(
            "absolute end-2 bottom-2 text-[11px] tabular-nums",
            isOverLimit ? "text-destructive font-bold" : "text-muted-foreground"
          )}
        >
          {t("composer.charCount", { current: charCount, max: MAX_CHARS })}
        </span>
      </div>

      {error ? (
        <div className="flex items-center gap-2">
          <p className="text-destructive flex-1 text-xs">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePost}
            disabled={isPosting}
            className="h-8 text-xs"
          >
            <RefreshCw className="me-1 h-3 w-3" />
            {t("error.retry")}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={handlePost}
          disabled={isPosting || isOverLimit || text.trim().length === 0}
          className="h-8 gap-1 text-xs"
        >
          {isPosting ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              {t("composer.posting")}
            </>
          ) : (
            <>
              <Send className="h-3 w-3" />
              {t("composer.postReply")}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAiPicker(!showAiPicker)}
          disabled={isPosting}
          className="h-8 gap-1 text-xs"
        >
          <Sparkles className="h-3 w-3" />
          {t("composer.generateAi")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={isPosting}
          className="h-8 text-xs"
        >
          Cancel
        </Button>
      </div>

      {showAiPicker ? (
        <InboxAiReplyPicker
          itemId={itemId}
          onSelectReply={handleAiSelect}
          onClose={() => setShowAiPicker(false)}
        />
      ) : null}
    </div>
  );
}
