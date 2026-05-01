import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { NotificationDeliveryStats } from "@/components/admin/notifications/notification-delivery-stats";
import { NotificationEditor } from "@/components/admin/notifications/notification-editor";
import { NotificationHistoryTable } from "@/components/admin/notifications/notification-history-table";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "Notifications — Admin" };

export default async function AdminNotificationsPage() {
  const t = await getTranslations("admin");
  const [statsResponse, historyResponse] = await Promise.all([
    fetchAdminData<any>("/notifications/stats"),
    fetchAdminData<any>("/notifications?limit=10&offset=0"),
  ]);
  const initialStats = statsResponse?.data ?? null;
  const initialHistory = historyResponse?.data ?? null;

  return (
    <AdminPageWrapper
      icon={Bell}
      title={t("pages.notifications.title")}
      description={t("pages.notifications.description")}
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
