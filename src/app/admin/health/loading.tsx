import { HeartPulse } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminHealthLoading() {
  return (
    <AdminPageWrapper
      icon={HeartPulse}
      title="System Health"
      description="Database connectivity, environment configuration, OAuth token status, and queue health."
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    </AdminPageWrapper>
  );
}
