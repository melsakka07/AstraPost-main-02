import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Shuffle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { VariantsClient } from "@/components/ai/variants-client";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { auth } from "@/lib/auth";
import { getMonthlyAiUsage, getMonthlyImageUsage } from "@/lib/services/ai-quota";

export default async function VariantsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [aiUsage, imageUsage, t] = await Promise.all([
    getMonthlyAiUsage(session.user.id).catch(() => null),
    getMonthlyImageUsage(session.user.id).catch(() => null),
    getTranslations("ai_writer"),
  ]);

  return (
    <DashboardPageWrapper
      icon={Shuffle}
      title={t("tab_meta.variants.title")}
      description={t("tab_meta.variants.description")}
    >
      <VariantsClient aiUsage={aiUsage} imageUsage={imageUsage} />
    </DashboardPageWrapper>
  );
}
