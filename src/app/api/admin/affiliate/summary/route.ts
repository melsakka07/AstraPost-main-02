import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { getAffiliateSummaryStats, getStartDate } from "@/lib/services/affiliate-stats";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  const startDate = getStartDate("30d");

  const stats = await getAffiliateSummaryStats(startDate);

  const avgConversionRate =
    stats.totalClicks > 0 ? (stats.totalConversions / stats.totalClicks) * 100 : 0;

  return Response.json({
    data: {
      totalAffiliates: stats.totalAffiliates,
      activeAffiliates: stats.activeAffiliates,
      totalEarnings: stats.totalEarnings,
      avgConversionRate: Math.round(avgConversionRate * 100) / 100,
    },
  });
}
