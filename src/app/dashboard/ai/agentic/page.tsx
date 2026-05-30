import dynamic from "next/dynamic";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { Wand2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserPlanType } from "@/lib/middleware/require-plan";
import { xAccounts, user } from "@/lib/schema";
import type { XSubscriptionTier } from "@/lib/schemas/common";
import { generateSeoMetadata } from "@/lib/seo";
import type { Metadata } from "next";

const AgenticPostingClient = dynamic(
  () => import("@/components/ai/agentic-posting-client").then((m) => m.AgenticPostingClient),
  {
    loading: () => (
      <div className="animate-pulse space-y-6">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    ),
    ssr: false,
  }
);

export async function generateMetadata(): Promise<Metadata> {
  return generateSeoMetadata(
    { en: "Agentic Posting — AstraPost", ar: "النشر الموكول — أسترا بوست" },
    { en: "Drop a topic. AI handles the rest.", ar: "ضع موضوعاً. والذكاء الاصطناعي يتولى الباقي." }
  );
}

export interface XAccountOption {
  id: string;
  username: string;
  profileImageUrl: string | null;
  subscriptionTier: XSubscriptionTier;
}

export default async function AgenticPostingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const t = await getTranslations("ai_agentic");

  const [dbUser, accounts] = await Promise.all([
    db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { voiceProfile: true },
    }),
    db
      .select({
        id: xAccounts.id,
        username: xAccounts.xUsername,
        profileImageUrl: xAccounts.xAvatarUrl,
        subscriptionTier: xAccounts.xSubscriptionTier,
      })
      .from(xAccounts)
      .where(and(eq(xAccounts.userId, session.user.id), eq(xAccounts.isActive, true))),
  ]);

  const userPlan = await getUserPlanType(session.user.id);
  const isLocked = userPlan === "free";

  const typedAccounts: XAccountOption[] = accounts.map((a) => ({
    id: a.id,
    username: a.username ?? "",
    profileImageUrl: a.profileImageUrl ?? null,
    subscriptionTier: (a.subscriptionTier ?? "None") as XSubscriptionTier,
  }));

  return (
    <DashboardPageWrapper icon={Wand2} title={t("title")} description={t("description")}>
      <AgenticPostingClient
        xAccounts={typedAccounts}
        hasVoiceProfile={!!dbUser?.voiceProfile}
        isLocked={isLocked}
        userPlan={userPlan}
      />
    </DashboardPageWrapper>
  );
}
