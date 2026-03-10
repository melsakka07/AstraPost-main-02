import { Suspense } from "react";
import { Composer } from "@/components/composer/composer";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComposePage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Compose New Post</h1>
      </div>
      <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
        <Composer />
      </Suspense>
    </div>
  );
}
