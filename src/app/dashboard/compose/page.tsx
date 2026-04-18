import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PenSquare } from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { PostUsageBar } from "@/components/dashboard/post-usage-bar";
import { Skeleton } from "@/components/ui/skeleton";

const ComposerWrapper = dynamic(
  () => import("@/components/composer/composer-wrapper").then((m) => m.ComposerWrapper),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-10 w-32 rounded" />
        <Skeleton className="h-10 w-full rounded" />
      </div>
    ),
  }
);

export default function ComposePage() {
  return (
    <DashboardPageWrapper
      icon={PenSquare}
      title="Compose"
      description="Create and schedule your tweets and threads."
    >
      <PostUsageBar />
      <Suspense fallback={<Skeleton className="h-[600px] w-full rounded-lg" />}>
        <ComposerWrapper />
      </Suspense>
    </DashboardPageWrapper>
  );
}
