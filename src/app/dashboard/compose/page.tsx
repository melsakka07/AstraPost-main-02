import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PenSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";
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

export default async function ComposePage() {
  const t = await getTranslations("compose");

  return (
    <DashboardPageWrapper icon={PenSquare} title={t("title")} description={t("description")}>
      <PostUsageBar />
      <Suspense fallback={<Skeleton className="h-[600px] w-full rounded-lg" />}>
        <ComposerWrapper />
      </Suspense>
    </DashboardPageWrapper>
  );
}
