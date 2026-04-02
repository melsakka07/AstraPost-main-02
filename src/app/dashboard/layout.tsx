import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, gte } from "drizzle-orm";
import { Rocket } from "lucide-react";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FailureBanner } from "@/components/dashboard/failure-banner";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TokenWarningBanner } from "@/components/dashboard/token-warning-banner";
import { DashboardTour } from "@/components/onboarding/dashboard-tour";
import { TrialBanner } from "@/components/ui/trial-banner";
import { db } from "@/lib/db";
import { user, posts, teamMembers, xAccounts } from "@/lib/schema";
import { getMonthlyAiUsage } from "@/lib/services/ai-quota";
import { getTeamContext } from "@/lib/team-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isOnboardingRoute = pathname.startsWith("/dashboard/onboarding");
  const ctx = await getTeamContext();
  if (!ctx) {
    redirect("/login");
  }
  const session = ctx.session;

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  const isOnboarded = dbUser?.onboardingCompleted ?? false;
  if (!isOnboarded && !isOnboardingRoute) {
    redirect("/dashboard/onboarding");
  }
  if (isOnboarded && isOnboardingRoute) {
    redirect("/dashboard");
  }

  if (isOnboardingRoute) {
    return (
      <div className="min-h-dvh bg-background flex flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Rocket className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="text-lg font-bold tracking-tight">AstraPost</span>
        </header>
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const [memberships, failedPost, inactiveAccount, aiUsage] = await Promise.all([
    db.query.teamMembers.findMany({
      where: eq(teamMembers.userId, session.user.id),
      with: {
        team: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    }),
    db.query.posts.findFirst({
      where: and(
        eq(posts.userId, session.user.id),
        eq(posts.status, "failed"),
        gte(posts.updatedAt, oneDayAgo)
      ),
      columns: { id: true },
    }),
    db.query.xAccounts.findFirst({
      where: and(
        eq(xAccounts.userId, session.user.id),
        eq(xAccounts.isActive, false)
      ),
      columns: { xUsername: true },
    }),
    getMonthlyAiUsage(session.user.id).catch(() => null),
  ]);

  const formattedMemberships = memberships.map((m) => ({
    team: {
      id: m.team.id,
      name: m.team.name,
      image: m.team.image,
    },
    role: m.role,
  }));

  return (
    <div data-dashboard-layout className="flex min-h-dvh bg-background pb-safe">
      <DashboardTour />
      <Sidebar
        aiUsage={aiUsage}
        user={{ name: session.user.name, image: session.user.image || null }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          user={{
            id: session.user.id,
            name: session.user.name,
            image: session.user.image || null,
          }}
          currentTeamId={ctx?.currentTeamId || session.user.id}
          memberships={formattedMemberships}
        />
        <AnnouncementBanner />
        {inactiveAccount && <TokenWarningBanner username={inactiveAccount.xUsername} />}
        <FailureBanner hasFailures={!!failedPost} />
        <TrialBanner
          trialEndsAt={dbUser?.trialEndsAt ?? null}
          plan={dbUser?.plan ?? "free"}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-page outline-none"
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
