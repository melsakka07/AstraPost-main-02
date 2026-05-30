import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ReplyGeneratorClient } from "@/components/ai/reply-generator-client";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { getTeamContext } from "@/lib/team-context";

export default async function ReplyGeneratorPage() {
  const ctx = await getTeamContext();
  if (!ctx) redirect("/login");

  const t = await getTranslations("ai_reply");

  return (
    <DashboardPageWrapper icon={MessageCircle} title={t("title")} description={t("description")}>
      <Breadcrumb items={[{ label: t("title") }]} className="mb-2" />
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        }
      >
        <ReplyGeneratorClient />
      </Suspense>
    </DashboardPageWrapper>
  );
}
