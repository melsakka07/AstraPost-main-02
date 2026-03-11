import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTeamContext } from "@/lib/team-context";
import { getPlanLimits, normalizePlan } from "@/lib/plan-limits";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InviteMemberDialog } from "@/components/settings/team/invite-member-dialog";
import { TeamMembersList } from "@/components/settings/team/team-members-list";

export default async function TeamSettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const ctx = await getTeamContext();
  if (!ctx) {
    redirect("/dashboard");
  }

  // Get current plan limits
  // We need to check the TEAM owner's plan, not necessarily the current user's plan
  const ownerData = await db.query.user.findFirst({
    where: (users, { eq }) => eq(users.id, ctx.currentTeamId),
    columns: { plan: true },
  });

  const plan = normalizePlan(ownerData?.plan);
  const limits = getPlanLimits(plan);
  const maxMembers = limits.maxTeamMembers;

  const canInvite = maxMembers !== null;
  const isOwner = ctx.isOwner;
  const isAdmin = ctx.role === "admin";
  const canManage = isOwner || isAdmin;

  // Fetch members
  const members = await db.query.teamMembers.findMany({
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
  });

  // Transform members for UI
  // Also include the owner as a "member" if not present in teamMembers table (which they aren't usually, as they own it)
  // Wait, teamMembers table links users to teams. The owner is the teamId.
  // Usually owner is not in teamMembers table in some schemas, but for consistent listing it's better if they are, OR we manually add them.
  // In `getTeamContext`, we fallback to owner role if ID matches.
  // Let's manually add owner to the list for display purposes.

  const ownerUser = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.id, ctx.currentTeamId),
  });

  const formattedMembers = [
    {
      id: "owner",
      userId: ownerUser!.id,
      name: ownerUser!.name,
      email: ownerUser!.email,
      image: ownerUser!.image,
      role: "owner",
      joinedAt: ownerUser!.createdAt,
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

  // Fetch invitations
  const invitations = await db.query.teamInvitations.findMany({
    where: (ti, { eq, and }) => and(
      eq(ti.teamId, ctx.currentTeamId),
      eq(ti.status, "pending")
    ),
    orderBy: (ti, { desc }) => [desc(ti.createdAt)],
  });

  const formattedInvitations = invitations.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    status: (i.status || "pending") as string,
    createdAt: i.createdAt,
  }));

  const currentCount = members.length + invitations.length; // Owner doesn't count towards limit usually, or does?
  // PLAN_LIMITS say "maxTeamMembers: 5". Usually excludes owner.
  // Let's assume excludes owner.

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
            <p className="text-muted-foreground mt-2">
                Manage your team members and their access levels.
            </p>
        </div>
        {canManage && canInvite && (
            <InviteMemberDialog />
        )}
      </div>

      {!canInvite && (
        <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertTitle>Upgrade Required</AlertTitle>
            <AlertDescription>
                Team management is only available on the Agency plan. 
                <Button variant="link" className="p-0 h-auto font-semibold ml-1" asChild>
                    <a href="/pricing">Upgrade now</a>
                </Button>
            </AlertDescription>
        </Alert>
      )}

      {canInvite && (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Members ({currentCount} / {maxMembers})</CardTitle>
                        <CardDescription>
                            People with access to this workspace.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <TeamMembersList 
                    members={formattedMembers} 
                    invitations={formattedInvitations}
                    currentUserId={session.user.id}
                    isOwner={isOwner}
                />
            </CardContent>
        </Card>
      )}
    </div>
  );
}
