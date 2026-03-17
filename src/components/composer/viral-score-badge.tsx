"use client";

import { useState, useEffect } from "react";
import { Sparkles, Lock, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { cn } from "@/lib/utils";

interface ViralScoreBadgeProps {
  content: string;
}

export function ViralScoreBadge({ content }: ViralScoreBadgeProps) {
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const { openWithContext } = useUpgradeModal();

  useEffect(() => {
    if (!content || content.length < 10) {
      setScore(null);
      setIsRestricted(false); // Reset restricted state if content is cleared
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/ai/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (res.status === 402) {
          setIsRestricted(true);
          setIsLoading(false);
          return;
        }

        if (!res.ok) throw new Error("Failed");

        const data = await res.json();
        setScore(data.score);
        setFeedback(data.feedback);
        setIsRestricted(false);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }, 2000); // 2s debounce

    return () => clearTimeout(timer);
  }, [content]);

  if (!content || content.length < 10) return null;

  if (isRestricted) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="relative group cursor-pointer" 
              onClick={() => openWithContext({ 
                feature: "viral_score", 
                message: "Unlock AI Viral Score to predict tweet performance before you post.",
                suggestedPlan: "pro_monthly"
              })}
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted blur-[2px] opacity-50 select-none border">
                <Sparkles className="w-4 h-4" />
                <span className="font-bold">85</span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-primary" />
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

  if (isLoading) {
    return (
      <div role="status" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-transparent">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="text-xs text-muted-foreground">Analyzing...</span>
      </div>
    );
  }

  if (score === null) return null;

  let color = "text-red-600 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900";
  if (score >= 40) color = "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-900";
  if (score >= 70) color = "text-green-600 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-900";

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-sm cursor-help transition-colors select-none", color)}>
            <Sparkles className="w-4 h-4" />
            <span>{score}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-4 space-y-2 z-50">
          <p className="font-semibold mb-1 flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-primary" />
            Viral Potential: {score}/100
          </p>
          <ul className="list-disc pl-4 text-xs space-y-1 text-muted-foreground">
            {feedback.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
