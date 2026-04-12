import { Megaphone } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnnouncementLoading() {
  return (
    <AdminPageWrapper
      icon={Megaphone}
      title="Announcements"
      description="Manage in-app announcements and system-wide notifications."
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
