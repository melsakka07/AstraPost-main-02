import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PdfToThreadClient } from "@/components/ai/pdf-to-thread/pdf-to-thread-client";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getTeamContext } from "@/lib/team-context";

export default async function PdfToThreadPage() {
  const ctx = await getTeamContext();
  if (!ctx) redirect("/login");

  const t = await getTranslations("ai_hub");

  return (
    <DashboardPageWrapper
      icon={FileText}
      title={t("pdf_to_thread.title")}
      description={t("pdf_to_thread.description")}
    >
      <Breadcrumb items={[{ label: t("pdf_to_thread.title") }]} className="mb-2" />
      <PdfToThreadClient />
    </DashboardPageWrapper>
  );
}
