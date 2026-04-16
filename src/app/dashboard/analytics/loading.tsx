import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      {/* Overview section */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-48" />
        <div className="bg-border h-px flex-1" />
      </div>

      {/* Follower tracking card */}
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </div>

      {/* Performance section */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-48" />
        <div className="bg-border h-px flex-1" />
      </div>

      {/* 5 stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>

      {/* Chart sections */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>

      {/* Insights section */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-48" />
        <div className="bg-border h-px flex-1" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    </div>
  );
}
