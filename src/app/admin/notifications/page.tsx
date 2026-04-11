import { Bell } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { NotificationDeliveryStats } from "@/components/admin/notifications/notification-delivery-stats";
import { NotificationEditor } from "@/components/admin/notifications/notification-editor";
import { NotificationHistoryTable } from "@/components/admin/notifications/notification-history-table";

export const metadata = { title: "Notifications — Admin" };

export default function AdminNotificationsPage() {
  return (
    <AdminPageWrapper
      icon={Bell}
      title="Notifications"
      description="Send and manage platform notifications to users."
    >
      <div className="space-y-6">
        <NotificationDeliveryStats />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <NotificationEditor />
          </div>
          <div className="lg:col-span-2">
            <NotificationHistoryTable />
          </div>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
