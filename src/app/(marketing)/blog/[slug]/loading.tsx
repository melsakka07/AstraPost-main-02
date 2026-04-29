import { Skeleton } from "@/components/ui/skeleton";

export default function BlogPostLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20" aria-busy="true">
      {/* Title */}
      <Skeleton className="mb-4 h-10 w-3/4 rounded-lg" />
      <Skeleton className="mb-2 h-6 w-1/2 rounded" />
      {/* Meta */}
      <div className="mb-10 flex items-center gap-3">
        <Skeleton className="h-5 w-24 rounded" />
        <Skeleton className="h-5 w-32 rounded" />
      </div>
      {/* Prose content skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-4/5 rounded" />
        <div className="py-2" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
        <div className="py-2" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-full rounded" />
      </div>
    </div>
  );
}
