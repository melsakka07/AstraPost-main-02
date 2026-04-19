import { Gift } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AffiliateConversionFunnel } from "@/components/admin/affiliate/affiliate-conversion-funnel";
import { AffiliateLeaderboard } from "@/components/admin/affiliate/affiliate-leaderboard";
import { AffiliateSummaryCards } from "@/components/admin/affiliate/affiliate-summary-cards";
import { AffiliateTrendsChart } from "@/components/admin/affiliate/affiliate-trends-chart";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "Affiliate Program — Admin" };

export default async function AdminAffiliatePage() {
  const [summaryRes, trendsRes, funnelRes, leaderboardRes] = await Promise.all([
    fetchAdminData<any>("/affiliate/summary"),
    fetchAdminData<any>("/affiliate/trends", { period: "30d" }),
    fetchAdminData<any>("/affiliate/funnel"),
    fetchAdminData<any>("/affiliate/leaderboard"),
  ]);

  return (
    <AdminPageWrapper
      icon={Gift}
      title="Affiliate Program"
      description="Referral metrics, conversion funnel, and top affiliates."
    >
      <div className="space-y-6">
        <AffiliateSummaryCards initialData={summaryRes?.data ?? null} />

        <div className="grid gap-6 lg:grid-cols-2">
          <AffiliateConversionFunnel initialData={funnelRes?.data ?? null} />
          <AffiliateTrendsChart initialData={trendsRes?.data?.data ?? null} />
        </div>

        <AffiliateLeaderboard initialData={leaderboardRes?.data ?? null} />
      </div>
    </AdminPageWrapper>
  );
}
