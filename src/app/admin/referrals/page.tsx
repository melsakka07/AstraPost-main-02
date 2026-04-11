import { Gift } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { ReferralDashboard } from "@/components/admin/referrals/referral-dashboard";

export const metadata = { title: "Referral Program — Admin" };

export default function AdminReferralsPage() {
  return (
    <AdminPageWrapper
      icon={Gift}
      title="Referral Program"
      description="Track referral performance, top referrers, and conversion rates."
    >
      <ReferralDashboard />
    </AdminPageWrapper>
  );
}
