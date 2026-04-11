import { Gift } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AffiliateConversionFunnel } from "@/components/admin/affiliate/affiliate-conversion-funnel";
import { AffiliateLeaderboard } from "@/components/admin/affiliate/affiliate-leaderboard";
import { AffiliateSummaryCards } from "@/components/admin/affiliate/affiliate-summary-cards";
import { AffiliateTrendsChart } from "@/components/admin/affiliate/affiliate-trends-chart";

export const metadata = { title: "Affiliate Program — Admin" };

export default function AdminAffiliatePage() {
  return (
    <AdminPageWrapper
      icon={Gift}
      title="Affiliate Program"
      description="Referral metrics, conversion funnel, and top affiliates."
    >
      <div className="space-y-6">
        <AffiliateSummaryCards />

        <div className="grid gap-6 lg:grid-cols-2">
          <AffiliateConversionFunnel />
          <AffiliateTrendsChart />
        </div>

        <AffiliateLeaderboard />
      </div>
    </AdminPageWrapper>
  );
}
