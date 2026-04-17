import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Download, User } from "lucide-react";
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackUrl=/dashboard/settings/profile");

  const userRow = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  return (
    <DashboardPageWrapper
      icon={User}
      title="Profile Settings"
      description="Manage your account profile and personal information"
    >
      <div className="max-w-3xl space-y-6">
        <ProfileForm
          initialData={{
            name: session.user.name,
            email: session.user.email,
            timezone: userRow?.timezone ?? null,
            language: userRow?.language ?? null,
            image: userRow?.image ?? null,
          }}
        />

        <ReopenChecklistButton />
        <ResumeOnboardingButton />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="text-primary h-5 w-5" />
              <CardTitle>Export Your Data</CardTitle>
            </div>
            <CardDescription>
              Download a copy of your posts, analytics, and account data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4 text-sm">
              Export your account data in JSON or CSV format for backup or analysis.
            </p>
            <Button variant="outline" asChild>
              <a href="/api/user/export">Download Data</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardPageWrapper>
  );
}
