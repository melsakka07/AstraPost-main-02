import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Award } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { MilestoneList } from "@/components/gamification/milestone-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { milestones } from "@/lib/schema";
import { generateSeoMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateSeoMetadata(
    { en: "Achievements — AstraPost", ar: "الإنجازات — أسترا بوست" },
    { en: "Track your progress and unlock rewards", ar: "تابع تقدمك وافتح المكافآت" }
  );
}

export default async function AchievementsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const t = await getTranslations("achievements");

  const unlocked = await db.query.milestones.findMany({
    where: eq(milestones.userId, session.user.id),
    columns: { milestoneId: true },
  });

  const unlockedIds = unlocked.map((m) => m.milestoneId);

  return (
    <DashboardPageWrapper icon={Award} title={t("title")} description={t("description")}>
      {unlockedIds.length === 0 ? (
        <EmptyState
          icon={<Award className="h-6 w-6" />}
          title={t("empty_title")}
          description={t("empty_description")}
          primaryAction={
            <Button asChild>
              <Link href="/dashboard/compose">{t("create_first_post")}</Link>
            </Button>
          }
          secondaryAction={
            <Button variant="outline" asChild>
              <Link href="/dashboard/analytics">{t("view_analytics")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-muted-foreground">{t("unlock_message")}</p>
          <MilestoneList unlockedMilestoneIds={unlockedIds} />
        </div>
      )}
    </DashboardPageWrapper>
  );
}
