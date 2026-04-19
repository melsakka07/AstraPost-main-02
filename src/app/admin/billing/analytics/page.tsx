import { TrendingUp } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { BillingAnalyticsDashboard } from "@/components/admin/billing/billing-analytics-dashboard";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "Billing Analytics — Admin" };

export default async function BillingAnalyticsPage() {
  const response = await fetchAdminData<any>("/billing/analytics", { page: 1 });
  const initialData = response ?? null;

  return (
    <AdminPageWrapper
      icon={TrendingUp}
      title="Billing Analytics"
      description="Plan conversions, churn, and recovery metrics"
    >
      <BillingAnalyticsDashboard initialData={initialData} />
    </AdminPageWrapper>
  );
}
