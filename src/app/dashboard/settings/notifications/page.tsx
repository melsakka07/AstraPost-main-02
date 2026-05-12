import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { NotificationPreferences } from "@/components/settings/notification-preferences";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export default async function NotificationSettingsPage() {
  const t = await getTranslations("settings");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackUrl=/dashboard/settings/notifications");

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { notificationSettings: true },
  });

  const defaultSettings = {
    postFailures: true,
    aiQuotaWarning: true,
    trialExpiry: true,
    teamInvites: true,
  };

  const initialSettings =
    (dbUser?.notificationSettings as typeof defaultSettings) || defaultSettings;

  return (
    <DashboardPageWrapper
      icon={Bell}
      title={t("notifications.title")}
      description={t("notifications.description")}
    >
      <div className="max-w-3xl">
        <NotificationPreferences initialSettings={initialSettings} />
      </div>
    </DashboardPageWrapper>
  );
}
