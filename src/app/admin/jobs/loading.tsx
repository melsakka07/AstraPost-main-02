import { Briefcase } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminJobsLoading() {
  return (
    <AdminPageWrapper
      icon={Briefcase}
      title="Background Jobs"
      description="BullMQ queue status, job history, and worker health."
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </AdminPageWrapper>
  );
}
