import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { OnboardingRedirect } from "@/components/dashboard/onboarding-redirect";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TrialBanner } from "@/components/ui/trial-banner";
import { UpgradeModal } from "@/components/ui/upgrade-modal";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

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

  const isOnboarded = dbUser?.onboardingCompleted ?? false;

  return (
    <div className="flex min-h-screen bg-background">
      <OnboardingRedirect isCompleted={isOnboarded} />
      <UpgradeModal />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TrialBanner
          trialEndsAt={dbUser?.trialEndsAt ?? null}
          plan={dbUser?.plan ?? "free"}
        />
        <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
