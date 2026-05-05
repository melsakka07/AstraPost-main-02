import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PdfToThreadClient } from "@/components/ai/pdf-to-thread/pdf-to-thread-client";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";

export default async function PdfToThreadPage() {
  const t = await getTranslations("ai_hub");

  return (
    <DashboardPageWrapper
      icon={FileText}
      title={t("pdf_to_thread.title")}
      description={t("pdf_to_thread.description")}
    >
      <PdfToThreadClient />
    </DashboardPageWrapper>
  );
}
