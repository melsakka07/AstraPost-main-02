"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, RefreshCw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { clientLogger } from "@/lib/client-logger";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { cn } from "@/lib/utils";

interface AiSuggestion {
  text: string;
  type: "agree" | "counter" | "funny";
}

interface InboxAiReplyPickerProps {
  itemId: string;
  onSelectReply: (text: string) => void;
  onClose: () => void;
}

const TYPE_LABEL_MAP: Record<AiSuggestion["type"], string> = {
  agree: "aiPicker.agree",
  counter: "aiPicker.counter",
  funny: "aiPicker.funny",
};

/**
 * AI reply variant picker. Calls POST /api/inbox/[id]/ai-suggestions
 * and displays 3 reply variants the user can select.
 */
export function InboxAiReplyPicker({ itemId, onSelectReply, onClose }: InboxAiReplyPickerProps) {
  const t = useTranslations("inbox");
  const [suggestions, setSuggestions] = useState<AiSuggestion[] | null>(null);
  const [voiceProfileUsed, setVoiceProfileUsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/inbox/${itemId}/ai-suggestions`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const apiError = (body as { error?: string })?.error ?? `Status ${res.status}`;
        throw new Error(apiError, { cause: { status: res.status } });
      }
      const data = (await res.json()) as {
        suggestions: AiSuggestion[];
        voiceProfileUsed: boolean;
      };
      setSuggestions(data.suggestions);
      setVoiceProfileUsed(data.voiceProfileUsed);
    } catch (err) {
      const status = err instanceof Error ? (err.cause as { status?: number })?.status : undefined;
      clientLogger.error("inbox_ai_reply_picker_failed", {
        itemId: itemId || "unknown",
        message: err instanceof Error ? err.message : String(err),
        status: status ?? 0,
      });
      setError(err instanceof Error ? err.message : t("aiPicker.error"));
    } finally {
      setIsLoading(false);
    }
  }, [itemId, t]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return (
    <Card className="border-primary/20 mt-2">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="text-primary h-4 w-4" />
            <h4 className="text-sm font-semibold">{t("aiPicker.title")}</h4>
          </div>
          {voiceProfileUsed ? (
            <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
              <Sparkles className="h-3 w-3" />
              {t("aiPicker.voiceProfileUsed")}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
            <RefreshCw className="h-4 w-4 animate-spin" />
            {t("aiPicker.loading")}
          </div>
        ) : error ? (
          <div className="space-y-2 py-2">
            <p className="text-destructive text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchSuggestions}>
              <RefreshCw className="me-1 h-3 w-3" />
              {t("aiPicker.tryAgain")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions?.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectReply(s.text)}
                className={cn(
                  "hover:bg-muted/50 w-full rounded-lg border p-3 text-start transition-colors",
                  "border-border"
                )}
                dir="auto"
              >
                <span className="text-muted-foreground mb-1 block text-[10px] font-medium tracking-wide uppercase">
                  {t(TYPE_LABEL_MAP[s.type])}
                </span>
                <p className="text-sm leading-relaxed">{s.text}</p>
              </button>
            ))}
            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" size="sm" onClick={fetchSuggestions} className="h-8 text-xs">
                <RefreshCw className="me-1 h-3 w-3" />
                {t("aiPicker.tryAgain")}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
