"use client";

import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────

export interface JobPhase {
  key: string;
  label: string;
}

export interface JobProgressCardProps {
  /** Current status label (e.g., "Downloading audio...") */
  statusLabel: string;
  /** Elapsed time display string (e.g., "Elapsed: 45s") */
  elapsedLabel: string;
  /** Ordered phases for progress dots. If empty array, no dots are rendered. */
  phases: JobPhase[];
  /** Index of current active phase (-1 = not yet started, dots all inactive) */
  currentPhaseIndex: number;
  /** Estimated time remaining in seconds, or null if unknown */
  estimatedSeconds: number | null;
  /** Estimated time label (e.g., "Typically ~20s") */
  estimatedTimeLabel: string;
  /** Whether there's a connection issue */
  connectionIssue: boolean;
  /** Connection issue banner text */
  connectionIssueLabel: string;
  /** Cancel handler */
  onCancel: () => void;
  /** Cancel button label */
  cancelLabel: string;
  /** Back/keep-waiting button label (AlertDialog cancel action) */
  backLabel: string;
  /** Cancel confirmation dialog title */
  cancelConfirmTitle: string;
  /** Cancel confirmation dialog description */
  cancelConfirmDescription: string;
  /** Whether the spinner should use muted color (true for queued/waiting) */
  spinnerMuted?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────

export function JobProgressCard({
  statusLabel,
  elapsedLabel,
  phases,
  currentPhaseIndex,
  estimatedSeconds,
  estimatedTimeLabel,
  connectionIssue,
  connectionIssueLabel,
  onCancel,
  cancelLabel,
  backLabel,
  cancelConfirmTitle,
  cancelConfirmDescription,
  spinnerMuted = false,
}: JobProgressCardProps) {
  const hasPhases = phases.length > 0;

  return (
    <div className="space-y-5">
      {/* Progress card */}
      <Card className="border-brand-6 bg-brand-3/10">
        <CardContent className="flex flex-col items-center gap-4 px-4 py-8 sm:py-10">
          {/* Spinner */}
          <Loader2
            className={cn(
              "h-10 w-10 animate-spin",
              spinnerMuted ? "text-muted-foreground" : "text-brand-9"
            )}
            aria-hidden="true"
          />

          {/* Status + elapsed */}
          <div className="space-y-1 text-center" aria-live="polite" aria-atomic="true">
            <p className="text-foreground text-sm font-semibold">{statusLabel}</p>
            <p className="text-muted-foreground text-xs">{elapsedLabel}</p>
          </div>

          {/* Phase dots */}
          {hasPhases && (
            <>
              <div className="flex items-center gap-2" aria-hidden="true">
                {phases.map((phase, idx) => {
                  const isActive = idx <= currentPhaseIndex;
                  const isCurrent = idx === currentPhaseIndex;
                  return (
                    <div key={phase.key} className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full transition-colors",
                          isActive ? "bg-brand-9" : "bg-muted",
                          isCurrent && "animate-pulse"
                        )}
                      />
                      {idx < phases.length - 1 && (
                        <div
                          className={cn("h-0.5 w-8 rounded", isActive ? "bg-brand-9" : "bg-muted")}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Phase labels */}
              <div className="flex w-full max-w-xs items-start justify-between gap-1">
                {phases.map((phase, idx) => {
                  const isActive = idx <= currentPhaseIndex;
                  return (
                    <span
                      key={phase.key}
                      className={cn(
                        "text-center text-[10px] leading-tight",
                        isActive ? "text-foreground font-medium" : "text-muted-foreground"
                      )}
                      style={{ width: `${100 / phases.length}%` }}
                    >
                      {phase.label}
                    </span>
                  );
                })}
              </div>
            </>
          )}

          {/* Estimated time */}
          {estimatedSeconds !== null && (
            <p className="text-muted-foreground text-xs">{estimatedTimeLabel}</p>
          )}
        </CardContent>
      </Card>

      {/* Connection issue banner */}
      {connectionIssue && (
        <p
          className="text-warning-9 bg-warning-3/30 border-warning-6 rounded-lg border px-3 py-2 text-sm"
          role="alert"
        >
          {connectionIssueLabel}
        </p>
      )}

      {/* Cancel button */}
      <div className="flex justify-center gap-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              {cancelLabel}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>{cancelConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{cancelConfirmDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{backLabel}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onCancel}>
                {cancelLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
