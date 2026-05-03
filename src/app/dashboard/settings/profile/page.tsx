import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Download, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { ProfileForm } from "@/components/settings/profile-form";
import { ReopenChecklistButton } from "@/components/settings/reopen-checklist-button";
import { ResumeOnboardingButton } from "@/components/settings/resume-onboarding-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export default async function ProfileSettingsPage() {
  const t = await getTranslations("settings");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackUrl=/dashboard/settings/profile");

  const userRow = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  return (
    <DashboardPageWrapper
      icon={User}
      title={t("profile.title")}
      description={t("profile.description")}
    >
      <div className="max-w-3xl space-y-6">
        <ProfileForm
          initialData={{
            name: session.user.name,
            email: session.user.email,
            timezone: userRow?.timezone ?? null,
            language: userRow?.language ?? null,
            image: userRow?.image ?? null,
            voiceVariant: userRow?.voiceVariant ?? "default",
            showMadeWithAstraPost:
              (
                userRow?.notificationSettings as {
                  showMadeWithAstraPost?: boolean;
                } | null
              )?.showMadeWithAstraPost ?? true,
          }}
        />

        <ReopenChecklistButton />
        <ResumeOnboardingButton />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="text-primary h-5 w-5" />
              <CardTitle>{t("profile.export_title")}</CardTitle>
            </div>
            <CardDescription>{t("profile.export_description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4 text-sm">{t("profile.export_details")}</p>
            <Button variant="outline" asChild>
              <a href="/api/user/export">{t("profile.download_data")}</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardPageWrapper>
  );
}
