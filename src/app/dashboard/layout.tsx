import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, gte } from "drizzle-orm";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FailureBanner } from "@/components/dashboard/failure-banner";
import { OnboardingRedirect } from "@/components/dashboard/onboarding-redirect";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardTour } from "@/components/onboarding/dashboard-tour";
import { TrialBanner } from "@/components/ui/trial-banner";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, posts, teamMembers } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  const ctx = await getTeamContext();
  
  // Fetch memberships
  const memberships = await db.query.teamMembers.findMany({
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
  });

  const formattedMemberships = memberships.map(m => ({
    team: {
      id: m.team.id,
      name: m.team.name,
      image: m.team.image,
    },
    role: m.role
  }));

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  // Failure banner should show failures for the current context (team or personal)
  // If in team context, show failures for team posts.
  const failedPost = await db.query.posts.findFirst({
    where: and(
        eq(posts.userId, ctx?.currentTeamId || session.user.id), // Actually posts.userId is the AUTHOR. 
        // We should check xAccountId's owner. 
        // But for simplicity, let's just check failures where the user has visibility.
        // If I am owner, I see all failures for my team.
        // If I am editor, I might see failures for posts I created?
        // Let's stick to session.user.id for now for failures, or update to use team context if we want to show team failures.
        // For now, let's keep it simple: Show failures for posts created by ME.
        eq(posts.userId, session.user.id),
        eq(posts.status, "failed"),
        gte(posts.updatedAt, oneDayAgo)
    ),
    columns: { id: true }
  });

  const isOnboarded = dbUser?.onboardingCompleted ?? false;

  return (
    <div className="flex min-h-full bg-background">
      <OnboardingRedirect isCompleted={isOnboarded} />
      {isOnboarded && <DashboardTour />}
      <Sidebar />
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
        <FailureBanner hasFailures={!!failedPost} />
        <TrialBanner
          trialEndsAt={dbUser?.trialEndsAt ?? null}
          plan={dbUser?.plan ?? "free"}
        />
        <main className="flex-1 p-4 pt-4 md:p-8 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
