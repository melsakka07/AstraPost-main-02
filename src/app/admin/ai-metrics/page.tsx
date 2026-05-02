import { Gauge } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import {
  RouteLatencyTable,
  ModelLatencyTable,
  FallbackSummary,
  FeedbackBreakdown,
} from "@/components/admin/ai-cost-charts";
import { StatCard } from "@/components/ui/stat-card";
import {
  getLatencyByRoute,
  getLatencyByModel,
  getFallbackRate,
  getFeedbackByVersion,
} from "@/lib/services/admin-ai-metrics";

export const metadata = { title: "AI Metrics — Admin" };

export default async function AiMetricsPage() {
  const [latencyByRoute, latencyByModel, fallbackRate, feedbackByVersion] = await Promise.all([
    getLatencyByRoute(7),
    getLatencyByModel(7),
    getFallbackRate(7),
    getFeedbackByVersion(7),
  ]);

  const worstRoute = latencyByRoute[0];
  const worstModel = latencyByModel[0];

  return (
    <AdminPageWrapper
      icon={Gauge}
      title="AI Latency SLO Dashboard"
      description="Monitor AI generation latency, fallback rates, and feedback quality"
    >
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Fallback Rate"
          value={`${fallbackRate.percentage}%`}
          icon={Gauge}
          variant={fallbackRate.percentage > 10 ? "destructive" : "success"}
          description={`${fallbackRate.fallbackCount.toLocaleString()} of ${fallbackRate.count.toLocaleString()} calls`}
        />
        <StatCard
          title="Worst Route p99"
          value={worstRoute ? `${worstRoute.p99}ms` : "N/A"}
          icon={Gauge}
          variant={worstRoute && worstRoute.p99 > 5000 ? "destructive" : "default"}
          description={
            worstRoute
              ? `${worstRoute.subFeature} (${worstRoute.count.toLocaleString()} calls)`
              : "No data"
          }
        />
        <StatCard
          title="Worst Model p95"
          value={worstModel ? `${worstModel.p95}ms` : "N/A"}
          icon={Gauge}
          variant={worstModel && worstModel.p95 > 5000 ? "destructive" : "default"}
          description={
            worstModel
              ? `${worstModel.model.split("/").pop()} (${worstModel.count.toLocaleString()} calls)`
              : "No data"
          }
        />
        <StatCard
          title="Feedback Versions"
          value={feedbackByVersion.length}
          icon={Gauge}
          variant="default"
          description="Active prompt versions with feedback"
        />
      </div>

      {/* Latency Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RouteLatencyTable data={latencyByRoute} />
        <ModelLatencyTable data={latencyByModel} />
      </div>

      {/* Fallback + Feedback */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FallbackSummary data={fallbackRate} />
        <FeedbackBreakdown data={feedbackByVersion} />
      </div>
    </AdminPageWrapper>
  );
}
