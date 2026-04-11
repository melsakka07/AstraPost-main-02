import { Bot } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AiUsageDashboard } from "@/components/admin/ai-usage/ai-usage-dashboard";

export default function AiUsagePage() {
  return (
    <AdminPageWrapper
      icon={Bot}
      title="AI Usage Analytics"
      description="Monitor AI generation metrics, top consumers, and usage trends"
    >
      <AiUsageDashboard />
    </AdminPageWrapper>
  );
}
