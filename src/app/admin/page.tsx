import { LayoutDashboard } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AdminActivityFeed } from "@/components/admin/activity-feed";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AdminDashboard } from "@/components/admin/dashboard/admin-dashboard";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "Dashboard — Admin" };

export default async function AdminDashboardPage() {
  const t = await getTranslations("admin");
  const [statsRes, billingRes] = await Promise.all([
    fetchAdminData<any>("/stats"),
    fetchAdminData<any>("/billing/overview"),
  ]);

  const initialData = {
    stats: statsRes?.data ?? null,
    billing: billingRes?.data ?? null,
  };

  return (
    <AdminPageWrapper
      icon={LayoutDashboard}
      title={t("pages.dashboard.title")}
      description={t("pages.dashboard.description")}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminDashboard initialData={initialData} />
        </div>
        <div>
          <AdminActivityFeed />
        </div>
      </div>
    </AdminPageWrapper>
  );
}
