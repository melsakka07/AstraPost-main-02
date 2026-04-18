import { Skeleton } from "@/components/ui/skeleton";

export default function AILoading() {
  return (
    <div className="space-y-6">
      {/* Quota meter skeleton */}
      <Skeleton className="h-32 w-full rounded-lg" />

      {/* AI Tools grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
