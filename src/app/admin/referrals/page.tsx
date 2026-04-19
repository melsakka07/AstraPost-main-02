import { Gift } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { ReferralDashboard } from "@/components/admin/referrals/referral-dashboard";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "Referral Program — Admin" };

export default async function AdminReferralsPage() {
  const response = await fetchAdminData<any>("/referrals", { page: 1 });
  const initialData = response?.data ?? null;

  return (
    <AdminPageWrapper
      icon={Gift}
      title="Referral Program"
      description="Track referral performance, top referrers, and conversion rates."
    >
      <ReferralDashboard initialData={initialData} />
    </AdminPageWrapper>
  );
}
