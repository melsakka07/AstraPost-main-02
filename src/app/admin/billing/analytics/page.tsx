import { TrendingUp } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { BillingAnalyticsDashboard } from "@/components/admin/billing/billing-analytics-dashboard";

export const metadata = { title: "Billing Analytics — Admin" };

export default function BillingAnalyticsPage() {
  return (
    <AdminPageWrapper
      icon={TrendingUp}
      title="Billing Analytics"
      description="Plan conversions, churn, and recovery metrics"
    >
      <BillingAnalyticsDashboard />
    </AdminPageWrapper>
  );
}
