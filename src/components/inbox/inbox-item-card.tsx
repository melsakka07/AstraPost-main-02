"use client";

import { useCallback, useState } from "react";
import { Archive, Bot, CheckCheck, MoreHorizontal, Reply } from "lucide-react";
import { useTranslations } from "next-intl";
import { InboxReplyComposer } from "@/components/inbox/inbox-reply-composer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserLocale } from "@/hooks/use-user-locale";
import { clientLogger } from "@/lib/client-logger";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { InboxItem } from "@/lib/schema";
import { cn } from "@/lib/utils";

// Color accents by engagement type
const TYPE_STYLES: Record<string, string> = {
  mention: "border-s-brand-8",
  reply: "border-s-success-8",
  quote: "border-s-warning-8",
};

const UNREAD_BG = "bg-muted/30";

interface InboxItemCardProps {
  item: InboxItem;
  onReply: (id: string) => void;
  onAiReply: (id: string) => void;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

/** Format date using the user's locale. Accepts Date or ISO string from API. */
function formatDate(dateStr: Date | string, locale: string): string {
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Single engagement card showing an inbox item with actions.
 * Color-coded by type, with unread indicator, and mobile-adaptive actions.
 */
export function InboxItemCard({
  item,
  onReply,
  onAiReply,
  onMarkRead,
  onArchive,
  isSelected,
  onToggleSelect,
}: InboxItemCardProps) {
  const t = useTranslations("inbox");
  const userLocale = useUserLocale();
  const [showComposer, setShowComposer] = useState(false);
  const [showAiPicker, setShowAiPicker] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const dateDisplay = formatDate(item.createdAt, userLocale);

  const handleSingleArchive = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const res = await fetchWithAuth(`/api/inbox/${item.id}/archive`, { method: "PATCH" });
      if (!res.ok) throw new Error(`Archive failed: ${res.status}`);
      onArchive(item.id);
    } catch (error) {
      clientLogger.error("inbox_single_archive_failed", {
        itemId: item.id,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsBusy(false);
    }
  }, [item.id, isBusy, onArchive]);

  const handleSingleMarkRead = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/inbox/${item.id}/read`, { method: "PATCH" });
      if (res.ok) onMarkRead(item.id);
    } catch (error) {
      clientLogger.error("inbox_single_mark_read_failed", {
        itemId: item.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [item.id, onMarkRead]);

  const accentBorder = TYPE_STYLES[item.type] ?? "border-s-muted";

  return (
    <div
      className={cn(
        "border-border rounded-lg border transition-colors",
        isSelected ? "bg-primary/5 border-primary/30" : item.isRead ? "" : UNREAD_BG,
        !item.isRead && `border-s-4 ${accentBorder}`
      )}
    >
      <div className="p-3 sm:p-4">
        {/* Header: avatar, handle, time, menu */}
        <div className="flex items-start gap-3">
          {/* Selection checkbox — desktop */}
          <button
            type="button"
            onClick={() => onToggleSelect(item.id)}
            className="mt-1 hidden shrink-0 sm:block"
            aria-label={isSelected ? "Deselect" : "Select"}
          >
            <div
              className={cn(
                "h-4 w-4 rounded border-2 transition-colors",
                isSelected
                  ? "bg-primary border-primary flex items-center justify-center"
                  : "border-muted-foreground/30 hover:border-muted-foreground"
              )}
            >
              {isSelected ? <CheckCheck className="text-primary-foreground h-3 w-3" /> : null}
            </div>
          </button>

          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage
              src={item.sourceAuthorAvatarUrl ?? undefined}
              alt={item.sourceAuthorHandle}
            />
            <AvatarFallback className="text-[10px]">
              {item.sourceAuthorHandle.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">@{item.sourceAuthorHandle}</span>
              {item.isReplied ? (
                <span className="bg-success-3 text-success-11 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
                  <CheckCheck className="h-3 w-3" />
                  {item.aiReplied ? t("item.aiReplied") : t("item.replied")}
                </span>
              ) : null}
              <span className="text-muted-foreground shrink-0 text-xs">{dateDisplay}</span>
            </div>

            {/* Engagement type label */}
            <span
              className={cn(
                "mt-0.5 inline-block text-[10px] font-medium tracking-wide uppercase",
                item.type === "mention" && "text-brand-11",
                item.type === "reply" && "text-success-11",
                item.type === "quote" && "text-warning-11"
              )}
            >
              {item.type === "reply"
                ? t("item.repliedToYourTweet")
                : item.type === "quote"
                  ? t("item.quotedYourTweet")
                  : t("item.mentionedYou")}
            </span>
          </div>

          {/* Desktop actions */}
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            {!item.isReplied ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => {
                    setShowComposer(!showComposer);
                    setShowAiPicker(false);
                    if (!item.isRead) handleSingleMarkRead();
                  }}
                >
                  <Reply className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t("item.reply")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => {
                    setShowAiPicker(!showAiPicker);
                    setShowComposer(false);
                    if (!item.isRead) handleSingleMarkRead();
                  }}
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t("item.aiReply")}</span>
                </Button>
              </>
            ) : null}
            {!item.isRead ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={handleSingleMarkRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              disabled={isBusy}
              className="h-8 text-xs"
              onClick={handleSingleArchive}
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Mobile overflow menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="sm:hidden">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {!item.isReplied ? (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setShowComposer(true);
                      setShowAiPicker(false);
                      if (!item.isRead) handleSingleMarkRead();
                    }}
                  >
                    <Reply className="me-2 h-4 w-4" />
                    {t("item.reply")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setShowAiPicker(true);
                      setShowComposer(false);
                      if (!item.isRead) handleSingleMarkRead();
                    }}
                  >
                    <Bot className="me-2 h-4 w-4" />
                    {t("item.aiReply")}
                  </DropdownMenuItem>
                </>
              ) : null}
              {!item.isRead ? (
                <DropdownMenuItem onClick={handleSingleMarkRead}>
                  <CheckCheck className="me-2 h-4 w-4" />
                  {t("item.markRead")}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={handleSingleArchive}>
                <Archive className="me-2 h-4 w-4" />
                {t("item.archive")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Engagement text */}
        <div className="mt-2" dir="auto">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.sourceText}</p>
        </div>

        {/* Context: your tweet that was engaged with */}
        {item.yourTweetText ? (
          <div className="border-border bg-muted/30 mt-2 rounded-md border px-3 py-2">
            <p className="text-muted-foreground mb-0.5 text-[10px] font-medium uppercase">
              {t("item.repliedToYourTweet")}
            </p>
            <p className="text-muted-foreground line-clamp-2 text-xs" dir="auto">
              {item.yourTweetText}
            </p>
          </div>
        ) : null}

        {/* Composer (expandable) */}
        {showComposer ? (
          <InboxReplyComposer
            itemId={item.id}
            itemText={item.sourceText}
            itemAuthor={item.sourceAuthorHandle}
            onPosted={() => {
              setShowComposer(false);
              onReply(item.id);
            }}
            onClose={() => setShowComposer(false)}
          />
        ) : null}

        {/* AI picker (expandable) */}
        {showAiPicker ? (
          <InboxReplyComposer
            itemId={item.id}
            itemText={item.sourceText}
            itemAuthor={item.sourceAuthorHandle}
            onPosted={() => {
              setShowAiPicker(false);
              onAiReply(item.id);
            }}
            onClose={() => setShowAiPicker(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
