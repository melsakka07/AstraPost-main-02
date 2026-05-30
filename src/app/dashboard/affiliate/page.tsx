import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AffiliateClient } from "@/components/affiliate/affiliate-client";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { getTeamContext } from "@/lib/team-context";

export default async function AffiliatePage() {
  const ctx = await getTeamContext();
  if (!ctx) redirect("/login");

  const t = await getTranslations("affiliate");
  const userLanguage =
    ctx.session?.user && "language" in ctx.session.user
      ? ((ctx.session.user as Record<string, unknown>).language as string) || "ar"
      : "ar";

  return (
    <DashboardPageWrapper icon={Package} title={t("title")} description={t("description")}>
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <Skeleton className="h-8 w-[200px]" />
              <Skeleton className="mt-2 h-4 w-[300px]" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[100px] w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        }
      >
        <AffiliateClient userLanguage={userLanguage} />
      </Suspense>
    </DashboardPageWrapper>
  );
}
