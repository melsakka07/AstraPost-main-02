import { Activity } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { XCostDashboard } from "@/components/admin/x-cost-charts";
import {
  getDailyXSpend,
  getTodayXSpend,
  getTotalXSpend,
  getTeamXBudgetSummaries,
  getXActionBreakdown,
  getTopXSpenders,
} from "@/lib/services/admin-x-metrics";

export const metadata = { title: "X API Cost Dashboard — Admin" };

export default async function XCostPage() {
  const [
    dailyXSpend7,
    dailyXSpend30,
    todaySpendMicro,
    totalSpendMicro30,
    teamBudgets,
    actionBreakdown,
    topSpenders,
  ] = await Promise.all([
    getDailyXSpend(7),
    getDailyXSpend(30),
    getTodayXSpend(),
    getTotalXSpend(30),
    getTeamXBudgetSummaries(),
    getXActionBreakdown(30),
    getTopXSpenders(30, 10),
  ]);

  return (
    <AdminPageWrapper
      icon={Activity}
      title="X API Cost Monitoring"
      description="Track per-team X API spend, budget utilization, and cost trends"
    >
      <XCostDashboard
        dailyXSpend7={dailyXSpend7}
        dailyXSpend30={dailyXSpend30}
        todaySpendMicro={todaySpendMicro}
        totalSpendMicro30={totalSpendMicro30}
        teamBudgets={teamBudgets}
        actionBreakdown={actionBreakdown}
        topSpenders={topSpenders}
      />
    </AdminPageWrapper>
  );
}
