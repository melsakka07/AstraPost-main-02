import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Hash } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { HashtagsClient } from "@/components/ai/hashtags-client";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { auth } from "@/lib/auth";
import { getMonthlyAiUsage, getMonthlyImageUsage } from "@/lib/services/ai-quota";

export default async function HashtagsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [aiUsage, imageUsage, t] = await Promise.all([
    getMonthlyAiUsage(session.user.id).catch(() => null),
    getMonthlyImageUsage(session.user.id).catch(() => null),
    getTranslations("ai_hub"),
  ]);

  return (
    <DashboardPageWrapper
      icon={Hash}
      title={t("tools.hashtag_generator.title")}
      description={t("tools.hashtag_generator.description")}
    >
      <HashtagsClient aiUsage={aiUsage} imageUsage={imageUsage} />
    </DashboardPageWrapper>
  );
}
