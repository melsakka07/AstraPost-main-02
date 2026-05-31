"use client";

import { Copy, Check, PenSquare, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AiResultActionsProps {
  itemCount: number;
  onCopyAll?: () => void;
  copyAllState?: "idle" | "copied";
  onSendToComposer?: () => void;
  sendToComposerDisabled?: boolean;
  onRegenerate?: () => void;
  regenerateDisabled?: boolean;
  quotaChip?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function AiResultActions({
  itemCount,
  onCopyAll,
  copyAllState = "idle",
  onSendToComposer,
  sendToComposerDisabled = false,
  onRegenerate,
  regenerateDisabled = false,
  quotaChip,
  children,
  className,
}: AiResultActionsProps) {
  const t = useTranslations("ai_writer");
  const isCopied = copyAllState === "copied";

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      {/* Left: item count badge */}
      <span className="text-muted-foreground text-sm font-medium tabular-nums">{itemCount}</span>

      {/* Right: action buttons */}
      <div className="flex items-center gap-2">
        {onCopyAll && (
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] min-w-[44px]"
            onClick={onCopyAll}
            aria-label={t("copy_all")}
          >
            {isCopied ? (
              <>
                <Check className="me-1.5 h-3.5 w-3.5" />
                {t("copy")}
              </>
            ) : (
              <>
                <Copy className="me-1.5 h-3.5 w-3.5" />
                {t("copy_all")}
              </>
            )}
          </Button>
        )}

        {onSendToComposer && (
          <Button
            size="sm"
            className="min-h-[44px] min-w-[44px]"
            onClick={onSendToComposer}
            disabled={sendToComposerDisabled}
            aria-label={t("open_composer")}
          >
            <PenSquare className="me-1.5 h-3.5 w-3.5" />
            {t("open_composer")}
          </Button>
        )}

        {onRegenerate && (
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] min-w-[44px]"
            onClick={onRegenerate}
            disabled={regenerateDisabled}
            aria-label={t("regenerate")}
          >
            <RefreshCw className="me-1.5 h-3.5 w-3.5" />
            {t("regenerate")}
          </Button>
        )}

        {quotaChip}

        {children}
      </div>
    </div>
  );
}

// ── Per-item variant ─────────────────────────────────────────────────────

export interface AiResultItemActionsProps {
  text: string;
  index: number;
  onCopy: (text: string, index: number) => void;
  copied?: boolean;
  onSendToComposer?: (text: string) => void;
  children?: React.ReactNode;
  className?: string;
}

export function AiResultItemActions({
  text,
  index,
  onCopy,
  copied = false,
  onSendToComposer,
  children,
  className,
}: AiResultItemActionsProps) {
  const t = useTranslations("ai_writer");

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="h-10 min-h-[44px] w-10 min-w-[44px] shrink-0 p-0"
        onClick={() => onCopy(text, index)}
        aria-label={t("copy")}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>

      {onSendToComposer && (
        <Button
          variant="ghost"
          size="sm"
          className="h-10 min-h-[44px] w-10 min-w-[44px] shrink-0 p-0"
          onClick={() => onSendToComposer(text)}
          aria-label={t("open_composer")}
        >
          <PenSquare className="h-3.5 w-3.5" />
        </Button>
      )}

      {children}
    </div>
  );
}
