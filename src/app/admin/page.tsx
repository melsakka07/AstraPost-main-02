import { LayoutDashboard } from "lucide-react";
import { AdminActivityFeed } from "@/components/admin/activity-feed";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AdminDashboard } from "@/components/admin/dashboard/admin-dashboard";

export const metadata = { title: "Dashboard — Admin" };

export default async function AdminDashboardPage() {
  return (
    <AdminPageWrapper
      icon={LayoutDashboard}
      title="Dashboard"
      description="Key metrics and system overview at a glance."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminDashboard initialData={null} />
        </div>
        <div>
          <AdminActivityFeed />
        </div>
      </div>
    </AdminPageWrapper>
  );
}
