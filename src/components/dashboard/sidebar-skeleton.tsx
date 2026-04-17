"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function SidebarSkeleton() {
  return (
    <div className="bg-card border-border hidden flex-col border-r md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0">
      <div className="flex h-full flex-col">
        {/* Brand */}
        <div className="border-border flex h-16 shrink-0 items-center gap-2 border-b px-6">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>

        {/* Navigation sections */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {/* Overview section */}
          <div className="space-y-0.5">
            {[...Array(1)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>

          {/* Content section */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-12 rounded-md" />
            <div className="space-y-0.5">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* AI Tools section */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-16 rounded-md" />
            <div className="space-y-0.5">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* Analytics section */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-16 rounded-md" />
            <div className="space-y-0.5">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* Growth section */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-12 rounded-md" />
            <div className="space-y-0.5">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* System section */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-12 rounded-md" />
            <div className="space-y-0.5">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* Roadmap link */}
          <div className="mt-6">
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </nav>

        {/* Bottom: Credits + Image quota + Sign out */}
        <div className="border-border shrink-0 space-y-3 border-t p-4">
          {/* AI Credits box */}
          <div className="border-border bg-muted/30 space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-8" />
            </div>
            <Skeleton className="h-1.5 w-full" />
            <Skeleton className="h-3 w-28" />
          </div>

          {/* Image quota box */}
          <div className="border-border bg-muted/30 space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-8" />
            </div>
            <Skeleton className="h-1.5 w-full" />
            <Skeleton className="h-3 w-28" />
          </div>

          {/* Sign out button */}
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
