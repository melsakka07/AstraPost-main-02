"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientLogger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";

type FeedbackValue = "positive" | "negative";

interface FeedbackButtonsProps {
  generationId: string;
  className?: string;
}

export function FeedbackButtons({ generationId, className }: FeedbackButtonsProps) {
  const [submittedValue, setSubmittedValue] = useState<FeedbackValue | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThanks, setShowThanks] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleFeedback = useCallback(
    async (value: FeedbackValue) => {
      // Allow toggling: if clicking the same value again, clear it
      if (submittedValue === value) {
        setSubmittedValue(null);
        setShowThanks(false);
        return;
      }

      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      setIsSubmitting(true);

      try {
        const res = await fetch("/api/ai/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generationId, value }),
          signal: abort.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          clientLogger.error("feedback_submit_failed", {
            generationId,
            status: res.status,
            error: (err as { error?: string }).error,
          });
          return;
        }

        setSubmittedValue(value);
        setShowThanks(true);

        // Auto-hide "Thanks!" after 2.5s
        setTimeout(() => setShowThanks(false), 2500);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        clientLogger.error("feedback_submit_error", {
          generationId,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [generationId, submittedValue]
  );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {showThanks ? (
        <span
          role="status"
          aria-live="polite"
          className="text-success-11 animate-in fade-in text-xs font-medium"
        >
          <Check className="mr-1 inline h-3 w-3" />
          Thanks!
        </span>
      ) : (
        <>
          <Button
            variant={submittedValue === "positive" ? "default" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => handleFeedback("positive")}
            disabled={isSubmitting}
            aria-label="Thumbs up"
            aria-pressed={submittedValue === "positive"}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={submittedValue === "negative" ? "destructive" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => handleFeedback("negative")}
            disabled={isSubmitting}
            aria-label="Thumbs down"
            aria-pressed={submittedValue === "negative"}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
