import { Skeleton } from "@/components/ui/skeleton";

export default function JobsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-[150px]" />
          <Skeleton className="mt-2 h-4 w-[250px]" />
        </div>
        <Skeleton className="h-10 w-[100px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[100px] w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[500px] w-full rounded-xl" />
    </div>
  );
}
