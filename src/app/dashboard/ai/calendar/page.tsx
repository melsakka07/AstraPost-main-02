import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { getTeamContext } from "@/lib/team-context";
import { CalendarGeneratorClient } from "./calendar-generator-client";

export default async function ContentCalendarPage() {
  const ctx = await getTeamContext();
  if (!ctx) redirect("/login");
  const t = await getTranslations("ai_calendar");

  return (
    <DashboardPageWrapper icon={CalendarDays} title={t("title")} description={t("description")}>
      <Breadcrumb items={[{ label: t("breadcrumb") }]} className="mb-2" />
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-lg" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-7">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        }
      >
        <CalendarGeneratorClient />
      </Suspense>
    </DashboardPageWrapper>
  );
}
