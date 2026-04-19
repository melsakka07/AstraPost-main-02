import { Bell } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { NotificationDeliveryStats } from "@/components/admin/notifications/notification-delivery-stats";
import { NotificationEditor } from "@/components/admin/notifications/notification-editor";
import { NotificationHistoryTable } from "@/components/admin/notifications/notification-history-table";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "Notifications — Admin" };

export default async function AdminNotificationsPage() {
  const [statsResponse, historyResponse] = await Promise.all([
    fetchAdminData<any>("/notifications/stats"),
    fetchAdminData<any>("/notifications"),
  ]);
  const initialStats = statsResponse?.data ?? null;
  const initialHistory = historyResponse?.data ?? null;

  return (
    <AdminPageWrapper
      icon={Bell}
      title="Notifications"
      description="Send and manage platform notifications to users."
    >
      <div className="space-y-6">
        <NotificationDeliveryStats initialData={initialStats} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <NotificationEditor />
          </div>
          <div className="lg:col-span-2">
            <NotificationHistoryTable initialData={initialHistory} />
          </div>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
