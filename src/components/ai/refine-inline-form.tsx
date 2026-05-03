"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Wand2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { clientLogger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";

type FocusArea = "tone" | "length" | "hook" | "hashtags";

const FOCUS_OPTIONS: Array<{ value: FocusArea; label: string }> = [
  { value: "tone", label: "Tone / Voice" },
  { value: "length", label: "Length" },
  { value: "hook", label: "Hook / Opening" },
  { value: "hashtags", label: "Hashtags" },
];

interface RefineInlineFormProps {
  generationId: string;
  originalOutput: string;
  onRefined: (refined: string) => void;
  className?: string;
}

export function RefineInlineForm({
  generationId,
  originalOutput: _originalOutput,
  onRefined,
  className,
}: RefineInlineFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [focus, setFocus] = useState<FocusArea | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleRefine = useCallback(async () => {
    if (!feedback.trim()) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/ai/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId,
          feedback: feedback.trim(),
          ...(focus !== undefined && { focus }),
        }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        clientLogger.error("refine_request_failed", {
          generationId,
          status: res.status,
          error: (err as { error?: string }).error,
        });
        return;
      }

      const data = (await res.json()) as { output: string };
      onRefined(data.output);
      setIsOpen(false);
      setFeedback("");
      setFocus(undefined);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      clientLogger.error("refine_request_error", {
        generationId,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [generationId, feedback, focus, onRefined]);

  return (
    <div className={cn("space-y-2", className)}>
      {!isOpen ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-7 gap-1 text-xs"
          onClick={() => setIsOpen(true)}
        >
          <Wand2 className="h-3 w-3" />
          Refine
        </Button>
      ) : (
        <div className="animate-in fade-in slide-in-from-top-1 space-y-3 rounded-lg border p-3 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Refine Output</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
              aria-label="Cancel refine"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refine-feedback" className="text-muted-foreground text-xs">
              What would you like to change?
            </Label>
            <Textarea
              id="refine-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. Make it more casual, add emojis, shorten it..."
              className="min-h-[60px] resize-none text-sm"
              maxLength={2000}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refine-focus" className="text-muted-foreground text-xs">
              Focus area (optional)
            </Label>
            <Select
              value={focus ?? ""}
              onValueChange={(v) => setFocus(v ? (v as FocusArea) : undefined)}
            >
              <SelectTrigger id="refine-focus" className="h-8 text-xs">
                <SelectValue placeholder="Auto-detect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto-detect</SelectItem>
                {FOCUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => void handleRefine()}
              disabled={!feedback.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Refining...
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3" />
                  Refine
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
