"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { StepIcon } from "@/components/ai/agentic/step-icon";
import type { StepState } from "@/components/ai/agentic/step-icon";
import { Button } from "@/components/ui/button";
import type { PipelineStep } from "@/lib/ai/agentic-types";

export type { StepState };

export interface StepProgress {
  state: StepState;
  summary?: string | undefined;
  elapsedMs?: number | undefined;
  startedAt?: number | undefined;
}

export const STEP_CONFIG: Record<PipelineStep, { label: string; estimatedMs: number }> = {
  research: { label: "Research", estimatedMs: 4000 },
  strategy: { label: "Strategy", estimatedMs: 3000 },
  writing: { label: "Writing", estimatedMs: 7000 },
  images: { label: "Images", estimatedMs: 20000 },
  review: { label: "Final Review", estimatedMs: 3000 },
  done: { label: "Done", estimatedMs: 0 },
};

export const ORDERED_STEPS: PipelineStep[] = [
  "research",
  "strategy",
  "writing",
  "images",
  "review",
];

interface ProcessingScreenProps {
  topic: string;
  steps: Record<PipelineStep, StepProgress>;
  showCancelConfirm: boolean;
  setShowCancelConfirm: (v: boolean) => void;
  onCancel: () => void;
  onBackground: () => void;
  broadSuggestions: string[];
  broadMessage: string;
  onSelectSuggestion: (s: string) => void;
}

export function ProcessingScreen({
  topic,
  steps,
  showCancelConfirm,
  setShowCancelConfirm,
  onCancel,
  onBackground,
  broadSuggestions,
  broadMessage,
  onSelectSuggestion,
}: ProcessingScreenProps) {
  const t = useTranslations("ai_agentic");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalEstimated = ORDERED_STEPS.reduce((acc, s) => acc + STEP_CONFIG[s].estimatedMs, 0);
  const completedMs = ORDERED_STEPS.reduce((acc, s) => {
    if (steps[s].state === "complete") return acc + STEP_CONFIG[s].estimatedMs;
    return acc;
  }, 0);
  const inProgressStep = ORDERED_STEPS.find((s) => steps[s].state === "in_progress");
  const inProgressElapsed =
    inProgressStep && steps[inProgressStep]?.startedAt ? now - steps[inProgressStep].startedAt! : 0;
  const remainingSecs = Math.max(
    0,
    Math.round((totalEstimated - completedMs - inProgressElapsed) / 1000)
  );

  return (
    <div className="animate-in fade-in mx-auto max-w-xl space-y-6 py-8 duration-300 md:max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="min-w-0">
          <p className="text-muted-foreground mb-1 text-xs tracking-wide uppercase">
            {t("processing_screen.generating_for_topic")}
          </p>
          <p className="truncate font-medium">{topic}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive ms-4 shrink-0"
          onClick={() => setShowCancelConfirm(true)}
        >
          {t("processing_screen.cancel")}
        </Button>
      </div>

      {/* Cancel confirm */}
      {showCancelConfirm && (
        <div className="border-destructive/30 bg-destructive/5 flex items-center justify-between gap-4 rounded-lg border p-4">
          <p className="text-sm">{t("processing_screen.stop_confirmation")}</p>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowCancelConfirm(false)}>
              {t("processing_screen.keep_going")}
            </Button>
            <Button size="sm" variant="destructive" onClick={onCancel}>
              {t("processing_screen.stop")}
            </Button>
          </div>
        </div>
      )}

      {/* Timeline — aria-live on single summary, not each step */}
      <div className="space-y-1" role="status" aria-live="polite">
        <span className="sr-only">
          {ORDERED_STEPS.filter((s) => steps[s].state !== "pending")
            .map((s) => `${STEP_CONFIG[s].label}: ${steps[s].state}`)
            .join(" · ")}
        </span>
        {ORDERED_STEPS.map((stepKey, i) => {
          const step = steps[stepKey];
          const config = STEP_CONFIG[stepKey];
          const isLast = i === ORDERED_STEPS.length - 1;

          return (
            <div key={stepKey} className="flex gap-3" aria-label={`${config.label}: ${step.state}`}>
              {/* Icon column */}
              <div className="flex flex-col items-center">
                <StepIcon state={step.state} />
                {!isLast && (
                  <div
                    className={`my-1 w-px flex-1 ${step.state === "complete" ? "bg-success-9/40" : "bg-border"}`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${step.state === "pending" ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {(() => {
                      if (stepKey === "research") return t("processing_screen.steps.research");
                      if (stepKey === "strategy") return t("processing_screen.steps.strategy");
                      if (stepKey === "writing") return t("processing_screen.steps.writing");
                      if (stepKey === "images") return t("processing_screen.steps.images");
                      if (stepKey === "review") return t("processing_screen.steps.review");
                      if (stepKey === "done") return t("processing_screen.steps.done");
                      return config.label;
                    })()}
                  </span>
                  {step.state === "complete" && step.elapsedMs && (
                    <span className="text-muted-foreground text-xs">
                      {(step.elapsedMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  {step.state === "in_progress" && (
                    <span className="text-primary animate-pulse text-xs">
                      {t("processing_screen.working")}
                    </span>
                  )}
                </div>
                {step.summary && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">{step.summary}</p>
                )}
                {step.state === "in_progress" && step.startedAt && (
                  <div className="bg-muted mt-2 h-1 w-48 overflow-hidden rounded-full">
                    <div
                      className="bg-primary/60 h-full rounded-full transition-[width] duration-1000"
                      style={{
                        width: `${Math.min(95, Math.round(((now - step.startedAt) / STEP_CONFIG[stepKey].estimatedMs) * 100))}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Estimated time */}
      {remainingSecs > 0 && (
        <p className="text-muted-foreground text-center text-xs">
          {t("processing_screen.remaining", { seconds: remainingSecs })}
        </p>
      )}

      {/* Background mode + cancel */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1.5 text-xs"
          onClick={onBackground}
        >
          {t("processing_screen.run_in_background")}
        </Button>
        <span className="text-muted-foreground/40 text-xs">
          {t("processing_screen.background_description")}
        </span>
      </div>

      {/* Broad topic suggestions overlay */}
      {broadSuggestions.length > 0 && (
        <div className="border-warning-6 bg-warning-2 dark:border-warning-8 dark:bg-warning-12/20 space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">{broadMessage}</p>
          <div className="flex flex-wrap gap-2">
            {broadSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSelectSuggestion(s)}
                className="border-warning-7 bg-warning-3 hover:bg-warning-4 dark:bg-warning-12/30 dark:hover:bg-warning-12/50 rounded-full border px-3 py-1 text-sm transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
