import { Suspense } from "react";
import dynamic from "next/dynamic";
import { LayoutDashboard } from "lucide-react";
import { AdminActivityFeed } from "@/components/admin/activity-feed";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

const AdminDashboard = dynamic(
  () => import("@/components/admin/dashboard/admin-dashboard").then((m) => m.AdminDashboard),
  {
    loading: () => <Skeleton className="h-[400px] w-full rounded-lg" />,
  }
);

export const metadata = { title: "Dashboard — Admin" };

export default function AdminDashboardPage() {
  return (
    <AdminPageWrapper
      icon={LayoutDashboard}
      title="Dashboard"
      description="Key metrics and system overview at a glance."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
            <AdminDashboard />
          </Suspense>
        </div>
        <div>
          <AdminActivityFeed />
        </div>
      </div>
    </AdminPageWrapper>
  );
}
