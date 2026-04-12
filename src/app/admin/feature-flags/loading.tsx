import { ToggleLeft } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminFeatureFlagsLoading() {
  return (
    <AdminPageWrapper
      icon={ToggleLeft}
      title="Feature Flags"
      description="Toggle platform features on or off. Changes take effect within 60 seconds."
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
