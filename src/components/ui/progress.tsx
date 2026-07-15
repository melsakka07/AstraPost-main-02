"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  showColorThresholds,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  showColorThresholds?: boolean;
}) {
  const percentage = value || 0;
  const colorClass = showColorThresholds
    ? percentage >= 100
      ? "[&>div]:bg-destructive"
      : percentage >= 80
        ? "[&>div]:bg-warning-9"
        : ""
    : "";

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        colorClass,
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
