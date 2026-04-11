import { HeartPulse } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { HealthDashboard } from "@/components/admin/health/health-dashboard";

export const metadata = { title: "System Health — Admin" };

export default function AdminHealthPage() {
  return (
    <AdminPageWrapper
      icon={HeartPulse}
      title="System Health"
      description="Database connectivity, environment configuration, OAuth token status, and queue health."
    >
      <HealthDashboard />
    </AdminPageWrapper>
  );
}
