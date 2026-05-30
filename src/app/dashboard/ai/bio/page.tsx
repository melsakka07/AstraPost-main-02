import { Suspense } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { UserPen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { xAccounts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";
import { BioGeneratorClient } from "./bio-generator-client";

export default async function BioOptimizerPage() {
  const ctx = await getTeamContext();
  if (!ctx) redirect("/login");
  const t = await getTranslations("ai_bio");

  const account = await db.query.xAccounts.findFirst({
    where: eq(xAccounts.userId, ctx.currentTeamId),
    columns: { xUsername: true },
  });
  const connectedUsername = account?.xUsername ?? "";

  return (
    <DashboardPageWrapper icon={UserPen} title={t("title")} description={t("description")}>
      <Breadcrumb items={[{ label: t("title") }]} className="mb-2" />
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        }
      >
        <BioGeneratorClient connectedUsername={connectedUsername} />
      </Suspense>
    </DashboardPageWrapper>
  );
}
