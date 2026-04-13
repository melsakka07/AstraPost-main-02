"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Lock, Loader2, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { cn } from "@/lib/utils";

interface ViralScoreBadgeProps {
  content: string;
  userPlan?: string;
}

type BadgeState = "idle" | "loading" | "restricted" | "rate_limited" | "error" | "score";

interface BadgeData {
  state: BadgeState;
  score: number | null;
  feedback: string[];
  errorMessage: string | null;
}

export function ViralScoreBadge({ content, userPlan }: ViralScoreBadgeProps) {
  const [data, setData] = useState<BadgeData>({
    state: "idle",
    score: null,
    feedback: [],
    errorMessage: null,
  });
  const { openWithContext } = useUpgradeModal();
  const contentRef = useRef(content);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchScore = useCallback(async (contentToAnalyze: string) => {
    setData((prev) => ({ ...prev, state: "loading", errorMessage: null }));
    try {
      const res = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentToAnalyze }),
      });

      if (res.status === 402) {
        setData((prev) => ({ ...prev, state: "restricted" }));
        return;
      }

      if (res.status === 429) {
        setData((prev) => ({
          ...prev,
          state: "rate_limited",
          errorMessage: "Rate limit reached. Try again in a few minutes.",
        }));
        return;
      }

      if (res.status === 503) {
        setData((prev) => ({
          ...prev,
          state: "error",
          errorMessage: "Service temporarily unavailable.",
        }));
        return;
      }

      if (!res.ok) {
        setData((prev) => ({
          ...prev,
          state: "error",
          errorMessage: "Failed to analyze content.",
        }));
        return;
      }

      const result = await res.json();
      setData({
        state: "score",
        score: result.score,
        feedback: result.feedback || [],
        errorMessage: null,
      });
    } catch (e) {
      console.error(e);
      setData((prev) => ({ ...prev, state: "error", errorMessage: "Network error." }));
    }
  }, []);

  useEffect(() => {
    if (!content || content.length < 10) {
      contentRef.current = content;
      return;
    }

    if (contentRef.current === content) return;
    contentRef.current = content;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const isProPlus =
      userPlan === "pro_monthly" || userPlan === "pro_annual" || userPlan === "agency";
    const debounceMs = isProPlus ? 3000 : 2000;

    timerRef.current = setTimeout(() => {
      fetchScore(content);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [content, fetchScore, userPlan]);

  if (!content || content.length < 10) return null;

  const { state, score, feedback, errorMessage } = data;

  if (state === "restricted") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="group relative cursor-pointer"
              onClick={() =>
                openWithContext({
                  feature: "viral_score",
                  message: "Unlock AI Viral Score to predict tweet performance before you post.",
                  suggestedPlan: "pro_monthly",
                })
              }
            >
              <div className="bg-muted flex items-center gap-2 rounded-full border px-3 py-1.5 opacity-50 blur-[2px] select-none">
                <Sparkles className="h-4 w-4" />
                <span className="font-bold">85</span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="text-primary h-4 w-4" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upgrade to unlock Viral Score</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (state === "rate_limited") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bg-muted/50 flex items-center gap-2 rounded-full border border-orange-200 px-3 py-1.5 text-orange-600 dark:border-orange-900 dark:text-orange-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Rate limited</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {errorMessage || "Too many requests. Please wait a few minutes."}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (state === "error") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bg-muted/50 flex items-center gap-2 rounded-full border border-red-200 px-3 py-1.5 text-red-600 dark:border-red-900 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Error</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{errorMessage || "Analysis failed. Try again."}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (state === "loading") {
    return (
      <div
        role="status"
        className="bg-muted/50 flex items-center gap-2 rounded-full border border-transparent px-3 py-1.5"
      >
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" aria-hidden="true" />
        <span className="text-muted-foreground text-xs">Analyzing...</span>
      </div>
    );
  }

  if (state === "idle" || score === null) return null;

  let color =
    "text-red-600 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900";
  if (score >= 40)
    color =
      "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-900";
  if (score >= 70)
    color =
      "text-green-600 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-900";

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex cursor-help items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold transition-colors select-none",
              color
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span>{score}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="z-50 max-w-xs space-y-2 p-4">
          <p className="mb-1 flex items-center gap-2 font-semibold">
            <Sparkles className="text-primary h-3 w-3" />
            Viral Potential: {score}/100
          </p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
            {feedback.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
