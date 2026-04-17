"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function DashboardHeaderSkeleton() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-3 border-b px-4 backdrop-blur sm:gap-x-4 sm:px-6 lg:px-8">
      {/* Mobile hamburger placeholder */}
      <Skeleton className="h-10 w-10 shrink-0 rounded-md md:hidden" />

      {/* Account switcher placeholder */}
      <Skeleton className="h-8 w-32 rounded-md" />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side icons/buttons placeholders */}
      <div className="flex items-center gap-3 lg:gap-6">
        {/* Language switcher */}
        <Skeleton className="h-6 w-6 rounded-md" />
        {/* Notification bell */}
        <Skeleton className="h-6 w-6 rounded-md" />
        {/* Divider (hidden on mobile) */}
        <div className="bg-border hidden h-6 w-px lg:block" aria-hidden="true" />
        {/* User profile */}
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </header>
  );
}
