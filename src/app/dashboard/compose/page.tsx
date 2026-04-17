import dynamic from "next/dynamic";
import { PenSquare } from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { PostUsageBar } from "@/components/dashboard/post-usage-bar";
import { Skeleton } from "@/components/ui/skeleton";

const Composer = dynamic(
  () => import("@/components/composer/composer").then((mod) => mod.Composer),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[600px] w-full" />,
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
      <Composer />
    </DashboardPageWrapper>
  );
}
