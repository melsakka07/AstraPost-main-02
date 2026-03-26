import { Tag } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { PromoCodesTable } from "@/components/admin/billing/promo-codes-table";

export const metadata = { title: "Promo Codes — Admin" };

export default function AdminPromoCodesPage() {
  return (
    <AdminPageWrapper
      icon={Tag}
      title="Promo Codes"
      description="Create and manage discount codes. Stripe coupons are created automatically."
    >
      <PromoCodesTable />
    </AdminPageWrapper>
  );
}
