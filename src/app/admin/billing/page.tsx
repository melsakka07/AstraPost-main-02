import { CreditCard } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { BillingOverview } from "@/components/admin/billing/billing-overview";

export const metadata = { title: "Billing — Admin" };

export default function AdminBillingPage() {
  return (
    <AdminPageWrapper
      icon={CreditCard}
      title="Billing"
      description="MRR, subscription metrics, and recent events."
    >
      <BillingOverview />
    </AdminPageWrapper>
  );
}
