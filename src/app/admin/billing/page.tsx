import { CreditCard } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { BillingOverview } from "@/components/admin/billing/billing-overview";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "Billing — Admin" };

export default async function AdminBillingPage() {
  const t = await getTranslations("admin");
  const [overviewRes, txRes] = await Promise.all([
    fetchAdminData<any>("/billing/overview"),
    fetchAdminData<any>("/billing/transactions"),
  ]);

  const initialData = {
    overview: overviewRes?.data ?? null,
    transactions: txRes?.data ?? [],
  };

  return (
    <AdminPageWrapper
      icon={CreditCard}
      title={t("pages.billing_overview.title")}
      description={t("pages.billing_overview.description")}
    >
      <BillingOverview initialData={initialData} />
    </AdminPageWrapper>
  );
}
