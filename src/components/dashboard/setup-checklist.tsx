"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SetupChecklistProps {
  hasXAccount: boolean;
  hasScheduledPost: boolean;
  hasUsedAI: boolean;
  hasProPlan: boolean;
}

export function SetupChecklist({
  hasXAccount,
  hasScheduledPost,
  hasUsedAI,
  hasProPlan,
}: SetupChecklistProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const hidden = localStorage.getItem("setup-checklist-hidden");
    if (hidden === "true") {
      // Use setTimeout to avoid synchronous state update warning during effect
      setTimeout(() => setIsVisible(false), 0);
    }
    setTimeout(() => setIsMounted(true), 0);
  }, []);

  if (!isMounted) return null;

  const steps = [
    {
      id: "connect-x",
      label: "Connect your X account",
      completed: hasXAccount,
      href: "/dashboard/settings",
      cta: "Connect",
    },
    {
      id: "schedule-post",
      label: "Schedule your first tweet",
      completed: hasScheduledPost,
      href: "/dashboard/compose",
      cta: "Compose",
    },
    {
      id: "try-ai",
      label: "Try the AI Writer",
      completed: hasUsedAI,
      href: "/dashboard/compose?tab=ai",
      cta: "Try AI",
    },
    {
      id: "explore-analytics",
      label: "Explore Analytics",
      completed: hasXAccount && hasScheduledPost, // Mark as done if they're active
      href: "/dashboard/analytics",
      cta: "View",
    },
    {
      id: "upgrade-pro",
      label: "Upgrade to Pro",
      completed: hasProPlan,
      href: "/pricing",
      cta: "Upgrade",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const allCompleted = completedCount === steps.length;

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("setup-checklist-hidden", "true");
  };

  if (!isVisible && !allCompleted) {
    // Optional: Show a minimized version or nothing? 
    // For now, if dismissed, it's gone until localstorage is cleared or we add a "show checklist" button somewhere.
    return null;
  }

  if (allCompleted && isVisible) {
      // Auto-dismiss after completion? Or show a success state?
      // Let's show a success state then allow dismiss
  }

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            🚀 Getting Started
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {completedCount}/{steps.length} completed
            </span>
          </CardTitle>
          <Progress value={progress} className="h-2 w-[200px]" />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDismiss}>
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3 transition-colors bg-background",
                step.completed ? "border-green-500/20 bg-green-500/5" : "hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-3">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    step.completed && "text-muted-foreground line-through"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!step.completed && (
                <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
                  <Link href={step.href}>{step.cta}</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
