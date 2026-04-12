import { ShieldCheck } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminImpersonationLoading() {
  return (
    <AdminPageWrapper
      icon={ShieldCheck}
      title="Impersonation"
      description="Active impersonation sessions and session history."
    >
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </AdminPageWrapper>
  );
}
