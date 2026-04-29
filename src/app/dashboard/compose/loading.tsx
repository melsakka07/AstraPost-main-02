import { Skeleton } from "@/components/ui/skeleton";

export default function ComposeLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      {/* Post usage bar */}
      <Skeleton className="h-12 w-full" />

      {/* Main composer area */}
      <div className="space-y-4">
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    </div>
  );
}
