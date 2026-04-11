import { Lightbulb } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AgenticMetricsCards } from "@/components/admin/agentic/agentic-metrics-cards";
import { AgenticSessionsTable } from "@/components/admin/agentic/agentic-sessions-table";

export const metadata = { title: "Agentic Posts — Admin" };

export default function AdminAgenticPage() {
  return (
    <AdminPageWrapper
      icon={Lightbulb}
      title="Agentic Posts"
      description="AI-powered posting sessions and performance metrics."
    >
      <div className="space-y-6">
        <AgenticMetricsCards />
        <div>
          <h2 className="mb-4 text-lg font-semibold">Sessions</h2>
          <AgenticSessionsTable />
        </div>
      </div>
    </AdminPageWrapper>
  );
}
