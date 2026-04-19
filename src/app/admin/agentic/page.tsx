import { Lightbulb } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AgenticMetricsCards } from "@/components/admin/agentic/agentic-metrics-cards";
import { AgenticSessionsTable } from "@/components/admin/agentic/agentic-sessions-table";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "Agentic Posts — Admin" };

export default async function AdminAgenticPage() {
  const [metricsRes, sessionsRes] = await Promise.all([
    fetchAdminData<any>("/agentic/metrics"),
    fetchAdminData<any>("/agentic/sessions"),
  ]);

  return (
    <AdminPageWrapper
      icon={Lightbulb}
      title="Agentic Posts"
      description="AI-powered posting sessions and performance metrics."
    >
      <div className="space-y-6">
        <AgenticMetricsCards initialData={metricsRes?.data ?? null} />
        <div>
          <h2 className="mb-4 text-lg font-semibold">Sessions</h2>
          <AgenticSessionsTable initialData={sessionsRes?.data ?? null} />
        </div>
      </div>
    </AdminPageWrapper>
  );
}
