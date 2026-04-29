import { Skeleton } from "@/components/ui/skeleton";

export default function JobsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* Filter bar */}
      <div className="space-y-4 rounded-lg border p-4">
        <Skeleton className="h-5 w-24" />
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 flex-1 sm:min-w-[280px]" />
          <Skeleton className="h-11 w-32" />
        </div>
      </div>

      {/* Job list */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}
