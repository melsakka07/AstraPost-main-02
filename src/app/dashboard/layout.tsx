import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, gte } from "drizzle-orm";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FailureBanner } from "@/components/dashboard/failure-banner";
import { OnboardingRedirect } from "@/components/dashboard/onboarding-redirect";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardTour } from "@/components/onboarding/dashboard-tour";
import { TrialBanner } from "@/components/ui/trial-banner";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, posts, teamMembers } from "@/lib/schema";
import { getMonthlyAiUsage } from "@/lib/services/ai-quota";
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

  // Fetch AI usage server-side so Sidebar renders without a client-side skeleton flash.
  // Null fallback means Sidebar shows its skeleton state if the query fails.
  let aiUsage: Awaited<ReturnType<typeof getMonthlyAiUsage>> | null = null;
  try {
    aiUsage = await getMonthlyAiUsage(session.user.id);
  } catch {
    // Non-fatal — sidebar gracefully falls back to skeleton
  }

  return (
    // pb-safe adds env(safe-area-inset-bottom) padding so content never slides
    // under the home indicator on notched iPhones / modern Android devices.
    <div data-dashboard-layout className="flex min-h-dvh bg-background pb-safe">
      <OnboardingRedirect isCompleted={isOnboarded} />
      {isOnboarded && <DashboardTour />}
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
        <FailureBanner hasFailures={!!failedPost} />
        <TrialBanner
          trialEndsAt={dbUser?.trialEndsAt ?? null}
          plan={dbUser?.plan ?? "free"}
        />
        {/*
          id="main-content" — target for the skip-to-main-content link added
          in the root layout (Task 1.2). Without this id the skip link silently
          does nothing.

          tabIndex={-1} — allows the element to receive programmatic focus when
          the skip link is activated. Required for Firefox; Chrome/Safari handle
          it without this but it does no harm elsewhere.

          outline-none — suppresses the browser's default focus ring on this
          non-interactive container. The next Tab press after the skip link lands
          the user on the first interactive element inside <main>, which will
          show its own focus-visible ring as expected.
        */}
        <main
          id="main-content"
          tabIndex={-1}
          // pb-16 reserves room for the fixed BottomNav on mobile (M1)
          className="flex-1 p-page outline-none"
        >
          {children}
        </main>
      </div>
      {/* M1 — bottom navigation bar (mobile only) */}
      <BottomNav />
    </div>
  );
}
