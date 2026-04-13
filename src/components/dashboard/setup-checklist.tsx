"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronDown, Circle, Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SetupChecklistProps {
  hasXAccount: boolean;
  hasScheduledPost: boolean;
  hasUsedAI: boolean;
  hasProPlan: boolean;
}

const STORAGE_KEY = "setup-checklist-hidden";
const COLLAPSED_KEY = "setup-checklist-collapsed";

export function SetupChecklist({
  hasXAccount,
  hasScheduledPost,
  hasUsedAI,
  hasProPlan,
}: SetupChecklistProps) {
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const hidden = localStorage.getItem(STORAGE_KEY);
    const checklistOpen = searchParams.get("checklist") === "open";

    if (checklistOpen) {
      localStorage.setItem(STORAGE_KEY, "false");
      localStorage.setItem(COLLAPSED_KEY, "false");
      setTimeout(() => {
        setIsVisible(true);
        setIsExpanded(true);
        setIsMounted(true);
      }, 0);
    } else if (hidden === "true") {
      setTimeout(() => {
        setIsVisible(false);
        setIsMounted(true);
      }, 0);
    } else {
      const collapsed = localStorage.getItem(COLLAPSED_KEY);
      setTimeout(() => {
        if (collapsed !== "true") setIsExpanded(true);
        setIsMounted(true);
      }, 0);
    }
  }, [searchParams]);

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
      completed: hasXAccount && hasScheduledPost,
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
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const toggleExpanded = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    localStorage.setItem(COLLAPSED_KEY, next ? "false" : "true");
  };

  if (!isVisible) return null;
  if (allCompleted) return null;

  return (
    <div className="border-primary/20 from-primary/5 via-primary/[0.02] rounded-xl border bg-gradient-to-r to-transparent">
      {/* Compact header — always visible */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <Rocket className="text-primary h-4 w-4" />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="text-sm font-semibold">Getting Started</span>
          <span className="text-muted-foreground text-xs">
            {completedCount}/{steps.length}
          </span>
          <Progress value={progress} className="hidden h-1.5 w-24 sm:block" />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleExpanded}
            aria-label={isExpanded ? "Collapse checklist" : "Expand checklist"}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-7 w-7"
            onClick={handleDismiss}
            aria-label="Dismiss checklist"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expandable step list */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {steps.map((step) => (
              <Link
                key={step.id}
                href={step.completed ? "#" : step.href}
                className={cn(
                  "group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                  step.completed
                    ? "text-muted-foreground pointer-events-none border-green-500/20 bg-green-500/5"
                    : "border-border bg-background hover:border-primary/30 hover:bg-primary/5"
                )}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <Circle className="text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0" />
                )}
                <span className={cn("whitespace-nowrap", step.completed && "line-through")}>
                  {step.label}
                </span>
                {!step.completed && (
                  <span className="text-primary ml-1 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100">
                    {step.cta}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
