import { redirect } from "next/navigation";
import { Youtube } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { YoutubeToThreadClient } from "@/components/ai/youtube-to-thread/youtube-to-thread-client";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getTeamContext } from "@/lib/team-context";

export default async function YoutubeToThreadPage() {
  const ctx = await getTeamContext();
  if (!ctx) redirect("/login");

  const t = await getTranslations("ai_hub");
  return (
    <DashboardPageWrapper
      icon={Youtube}
      title={t("youtube_to_thread.title")}
      description={t("youtube_to_thread.description")}
    >
      <Breadcrumb items={[{ label: t("youtube_to_thread.title") }]} className="mb-2" />
      <YoutubeToThreadClient />
    </DashboardPageWrapper>
  );
}
