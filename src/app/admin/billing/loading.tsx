import { CreditCard } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <AdminPageWrapper
      icon={CreditCard}
      title="Billing"
      description="MRR, subscription metrics, and recent events."
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </AdminPageWrapper>
  );
}
