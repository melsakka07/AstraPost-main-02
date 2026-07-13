import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DiscoverClient } from "@/app/dashboard/ai/discover/discover-client";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlanStatus } from "@/lib/middleware/require-plan";
import { getPlanLimits } from "@/lib/plan-limits";
import { getTeamContext } from "@/lib/team-context";

export default async function DiscoverPage() {
  const ctx = await getTeamContext();
  if (!ctx) redirect("/login");

  const t = await getTranslations("ai_discovery");

  const planStatus = await getPlanStatus(ctx.currentTeamId);
  const limits = getPlanLimits(planStatus.effectivePlan);
  const maxYoutubeDurationSeconds = limits.maxYoutubeVideoDurationSeconds;

  return (
    <DashboardPageWrapper icon={Compass} title={t("title")} description={t("description")}>
      <Breadcrumb items={[{ label: t("title") }]} className="mb-2" />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <DiscoverClient maxYoutubeDurationSeconds={maxYoutubeDurationSeconds} />
      </Suspense>
    </DashboardPageWrapper>
  );
}
