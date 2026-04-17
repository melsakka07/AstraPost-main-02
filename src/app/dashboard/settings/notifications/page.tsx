import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { NotificationPreferences } from "@/components/settings/notification-preferences";
import { auth } from "@/lib/auth";

export default async function NotificationSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackUrl=/dashboard/settings/notifications");

  return (
    <DashboardPageWrapper
      icon={Bell}
      title="Notification Preferences"
      description="Control how and when you receive notifications"
    >
      <div className="max-w-3xl">
        <NotificationPreferences
          initialSettings={{
            postFailures: true,
            aiQuotaWarning: true,
            trialExpiry: true,
            teamInvites: true,
          }}
        />
      </div>
    </DashboardPageWrapper>
  );
}
