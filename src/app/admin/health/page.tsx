import { HeartPulse } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { HealthDashboard } from "@/components/admin/health/health-dashboard";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "System Health — Admin" };

export default async function AdminHealthPage() {
  const t = await getTranslations("admin");
  const response = await fetchAdminData<any>("/health");
  const initialData = response ?? null;

  return (
    <AdminPageWrapper
      icon={HeartPulse}
      title={t("pages.health.title")}
      description={t("pages.health.description")}
    >
      <HealthDashboard initialData={initialData} />
    </AdminPageWrapper>
  );
}
