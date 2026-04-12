import { Lightbulb } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAgenticLoading() {
  return (
    <AdminPageWrapper
      icon={Lightbulb}
      title="Agentic Posts"
      description="AI-powered posting sessions and performance metrics."
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div>
          <Skeleton className="mb-4 h-7 w-32" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </AdminPageWrapper>
  );
}
