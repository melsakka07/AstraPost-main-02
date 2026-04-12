import { Bell } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminNotificationsLoading() {
  return (
    <AdminPageWrapper
      icon={Bell}
      title="Notifications"
      description="System notifications and in-app messages."
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
