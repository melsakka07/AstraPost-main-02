import { Youtube } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { YoutubeToThreadClient } from "@/components/ai/youtube-to-thread/youtube-to-thread-client";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";

export default async function YoutubeToThreadPage() {
  const t = await getTranslations("ai_hub");
  return (
    <DashboardPageWrapper
      icon={Youtube}
      title={t("youtube_to_thread.title")}
      description={t("youtube_to_thread.description")}
    >
      <YoutubeToThreadClient />
    </DashboardPageWrapper>
  );
}
