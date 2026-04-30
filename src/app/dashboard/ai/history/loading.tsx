import { Skeleton } from "@/components/ui/skeleton";

export default function AiHistoryLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-14 rounded" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
