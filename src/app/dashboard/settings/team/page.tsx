import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { InviteMemberDialog } from "@/components/settings/team/invite-member-dialog";
import { TeamMembersList } from "@/components/settings/team/team-members-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getPlanLimits, normalizePlan } from "@/lib/plan-limits";
import { getTeamContext } from "@/lib/team-context";

export default async function TeamSettingsPage() {
  const t = await getTranslations("settings");
  const ctx = await getTeamContext();
  if (!ctx) redirect("/dashboard");

  const [ownerData, members, ownerUser, invitations] = await Promise.all([
    db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, ctx.currentTeamId),
      columns: { plan: true },
    }),
    db.query.teamMembers.findMany({
      where: (tm, { eq }) => eq(tm.teamId, ctx.currentTeamId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: (tm, { desc }) => [desc(tm.joinedAt)],
    }),
    db.query.user.findFirst({
      where: (u, { eq }) => eq(u.id, ctx.currentTeamId),
    }),
    db.query.teamInvitations.findMany({
      where: (ti, { eq, and }) => and(eq(ti.teamId, ctx.currentTeamId), eq(ti.status, "pending")),
      orderBy: (ti, { desc }) => [desc(ti.createdAt)],
    }),
  ]);

  const plan = normalizePlan(ownerData?.plan);
  const limits = getPlanLimits(plan);
  const maxMembers = limits.maxTeamMembers;

  const canInvite = maxMembers !== null;
  const isOwner = ctx.isOwner;
  const isAdmin = ctx.role === "admin";
  const canManage = isOwner || isAdmin;

  if (!ownerUser) redirect("/dashboard");

  const formattedMembers = [
    {
      id: "owner",
      userId: ownerUser.id,
      name: ownerUser.name,
      email: ownerUser.email,
      image: ownerUser.image,
      role: "owner",
      joinedAt: ownerUser.createdAt,
    },
    ...members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  ];

  const formattedInvitations = invitations.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    status: (i.status || "pending") as string,
    createdAt: i.createdAt,
  }));

  const currentCount = members.length + invitations.length;

  return (
    <DashboardPageWrapper icon={Shield} title={t("team.title")} description={t("team.description")}>
      <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
        <div className="flex items-center justify-between">
          {canManage && canInvite && <InviteMemberDialog />}
        </div>

        {!canInvite && (
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertTitle>{t("team.upgrade_required_title")}</AlertTitle>
            <AlertDescription>
              {t("team.upgrade_required_desc")}
              <Button variant="link" className="ms-1 h-auto p-0 font-semibold" asChild>
                <a href="/pricing">{t("team.upgrade_cta")}</a>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {canInvite && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {t("team.members_count", { current: currentCount, max: maxMembers })}
                  </CardTitle>
                  <CardDescription>{t("team.members_description")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TeamMembersList
                members={formattedMembers}
                invitations={formattedInvitations}
                currentUserId={ctx.session.user.id}
                isOwner={isOwner}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
