import { TrendingUp } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";

export default function Loading() {
  return (
    <AdminPageWrapper
      icon={TrendingUp}
      title="Billing Analytics"
      description="Plan conversions, churn, and recovery metrics"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border p-4">
            <div className="bg-muted mb-2 h-4 w-24 rounded" />
            <div className="bg-muted mb-1 h-8 w-16 rounded" />
            <div className="bg-muted h-3 w-32 rounded" />
          </div>
        ))}
      </div>
      <div className="animate-pulse space-y-3">
        <div className="bg-muted h-6 w-40 rounded" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-muted h-10 rounded" />
        ))}
      </div>
    </AdminPageWrapper>
  );
}
