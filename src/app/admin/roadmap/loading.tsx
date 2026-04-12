import { Lightbulb } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminRoadmapLoading() {
  return (
    <AdminPageWrapper
      icon={Lightbulb}
      title="Roadmap"
      description="Review and moderate user-submitted feedback"
    >
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </AdminPageWrapper>
  );
}
