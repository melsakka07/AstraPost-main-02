import { Skeleton } from "@/components/ui/skeleton";

export default function AiWriterLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-10 w-48 rounded" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
