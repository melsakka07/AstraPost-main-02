import { Tag } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { PromoCodesTable } from "@/components/admin/billing/promo-codes-table";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "Promo Codes — Admin" };

export default async function AdminPromoCodesPage() {
  const response = await fetchAdminData<any>("/promo-codes");
  const initialData = response?.data ?? null;

  return (
    <AdminPageWrapper
      icon={Tag}
      title="Promo Codes"
      description="Create and manage discount codes. Stripe coupons are created automatically."
    >
      <PromoCodesTable initialData={initialData} />
    </AdminPageWrapper>
  );
}
