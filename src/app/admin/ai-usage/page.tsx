import { subDays } from "date-fns";
import { Bot } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AiUsageDashboard } from "@/components/admin/ai-usage/ai-usage-dashboard";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export default async function AiUsagePage() {
  const response = await fetchAdminData<any>("/ai-usage", {
    from: subDays(new Date(), 30).toISOString(),
    to: new Date().toISOString(),
  });
  const initialData = response?.data ?? null;

  return (
    <AdminPageWrapper
      icon={Bot}
      title="AI Usage Analytics"
      description="Monitor AI generation metrics, top consumers, and usage trends"
    >
      <AiUsageDashboard initialData={initialData} />
    </AdminPageWrapper>
  );
}
