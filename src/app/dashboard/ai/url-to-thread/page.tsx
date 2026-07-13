import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Link2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { UrlToThreadClient } from "@/components/ai/url-to-thread-client";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { auth } from "@/lib/auth";
import { getMonthlyAiUsage, getMonthlyImageUsage } from "@/lib/services/ai-quota";

export default async function UrlToThreadPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [aiUsage, imageUsage, t] = await Promise.all([
    getMonthlyAiUsage(session.user.id).catch(() => null),
    getMonthlyImageUsage(session.user.id).catch(() => null),
    getTranslations("ai_writer"),
  ]);

  return (
    <DashboardPageWrapper
      icon={Link2}
      title={t("tab_meta.url.title")}
      description={t("tab_meta.url.description")}
    >
      <UrlToThreadClient aiUsage={aiUsage} imageUsage={imageUsage} />
    </DashboardPageWrapper>
  );
}
