import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PenTool } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AIWriterClient } from "@/components/ai/ai-writer-client";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { auth } from "@/lib/auth";
import { getMonthlyAiUsage, getMonthlyImageUsage } from "@/lib/services/ai-quota";

export default async function AIWriterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [aiUsage, imageUsage, t] = await Promise.all([
    getMonthlyAiUsage(session.user.id).catch(() => null),
    getMonthlyImageUsage(session.user.id).catch(() => null),
    getTranslations("ai_writer"),
  ]);

  return (
    <DashboardPageWrapper icon={PenTool} title={t("title")} description={t("description")}>
      <AIWriterClient aiUsage={aiUsage} imageUsage={imageUsage} />
    </DashboardPageWrapper>
  );
}
