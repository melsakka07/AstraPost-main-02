import { HeartPulse } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { HealthDashboard } from "@/components/admin/health/health-dashboard";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "System Health — Admin" };

export default async function AdminHealthPage() {
  const response = await fetchAdminData<any>("/health");
  const initialData = response ?? null;

  return (
    <AdminPageWrapper
      icon={HeartPulse}
      title="System Health"
      description="Database connectivity, environment configuration, OAuth token status, and queue health."
    >
      <HealthDashboard initialData={initialData} />
    </AdminPageWrapper>
  );
}
