import { ShieldAlert } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAuditLoading() {
  return (
    <AdminPageWrapper
      icon={ShieldAlert}
      title="Audit Log"
      description="System-wide audit trail and admin activity history."
    >
      <div className="space-y-4">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </AdminPageWrapper>
  );
}
