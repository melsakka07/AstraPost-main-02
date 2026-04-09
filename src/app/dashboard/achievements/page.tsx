import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Metadata } from "next";
import { MilestoneList } from "@/components/gamification/milestone-list";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { milestones } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Achievements - AstraPost",
  description: "Track your progress and unlock rewards",
};

export default async function AchievementsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const unlocked = await db.query.milestones.findMany({
    where: eq(milestones.userId, session.user.id),
    columns: { milestoneId: true },
  });

  const unlockedIds = unlocked.map((m) => m.milestoneId);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Achievements</h1>
      </div>

      <div className="space-y-4">
        <p className="text-muted-foreground">
          Unlock badges by growing your audience and posting consistently.
        </p>
        <MilestoneList unlockedMilestoneIds={unlockedIds} />
      </div>
    </div>
  );
}
