import { Suspense } from "react";
import { PenSquare } from "lucide-react";
import { Composer } from "@/components/composer/composer";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComposePage() {
  return (
    <DashboardPageWrapper
      icon={PenSquare}
      title="Compose"
      description="Create and schedule your tweets and threads."
    >
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <Composer />
      </Suspense>
    </DashboardPageWrapper>
  );
}
