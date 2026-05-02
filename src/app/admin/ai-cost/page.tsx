import { DollarSign } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import {
  MiniBarChart,
  TopSpendersTable,
  FeatureBreakdownTable,
  ModelMixTable,
} from "@/components/admin/ai-cost-charts";
import { StatCard } from "@/components/ui/stat-card";
import {
  getDailyCost,
  getTodayCost,
  getTotalCost,
  getTopSpenders,
  getCostByFeature,
  getModelMix,
} from "@/lib/services/admin-ai-metrics";

export const metadata = { title: "AI Cost Dashboard — Admin" };

export default async function AiCostPage() {
  const [dailyCost7, dailyCost30, todayCost, totalCost30, topSpenders, costByFeature, modelMix] =
    await Promise.all([
      getDailyCost(7),
      getDailyCost(30),
      getTodayCost(),
      getTotalCost(30),
      getTopSpenders(30, 10),
      getCostByFeature(30),
      getModelMix(30),
    ]);

  const todayDollars = (todayCost / 100).toFixed(2);
  const totalDollars30 = (totalCost30 / 100).toFixed(2);
  const totalGenerations30 = dailyCost30.reduce((sum, d) => sum + d.count, 0);

  return (
    <AdminPageWrapper
      icon={DollarSign}
      title="AI Cost Dashboard"
      description="Cost of goods sold — AI generation spend tracking across models and features"
    >
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Spend"
          value={`$${todayDollars}`}
          icon={DollarSign}
          variant="success"
          description="Total AI generation cost today"
        />
        <StatCard
          title="30-Day Spend"
          value={`$${totalDollars30}`}
          icon={DollarSign}
          variant="default"
          description={`${totalGenerations30.toLocaleString()} generations`}
        />
        <StatCard
          title="Top Feature"
          value={costByFeature[0]?.subFeature ?? "N/A"}
          icon={DollarSign}
          variant="warning"
          description={
            costByFeature[0]
              ? `${costByFeature[0].count.toLocaleString()} calls — $${(costByFeature[0].cost / 100).toFixed(2)}`
              : "No data"
          }
        />
        <StatCard
          title="Top Model"
          value={modelMix[0]?.model?.split("/").pop() ?? "N/A"}
          icon={DollarSign}
          variant="default"
          description={modelMix[0] ? `${modelMix[0].percentage}% of all calls` : "No data"}
        />
      </div>

      {/* 7-Day Trend Chart */}
      <MiniBarChart data={dailyCost7} />

      {/* Tables: 2-column grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopSpendersTable data={topSpenders} />
        <FeatureBreakdownTable data={costByFeature} />
      </div>

      <ModelMixTable data={modelMix} />
    </AdminPageWrapper>
  );
}
