import { desc, isNotNull, eq } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { ImpersonationTable } from "@/components/admin/impersonation/impersonation-table";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { session, user } from "@/lib/schema";

export const metadata = { title: "Impersonation Sessions — Admin" };

export default async function AdminImpersonationPage() {
  await requireAdmin();

  // Join session with user (target) and user (admin)
  const activeSessions = await db
    .select({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      targetUserId: session.userId,
      targetUserEmail: user.email,
      targetUserName: user.name,
      adminId: session.impersonatedBy,
      // Need a subquery or join alias for admin user.
      // Drizzle ORM requires aliasing to join the same table twice.
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(isNotNull(session.impersonatedBy))
    .orderBy(desc(session.createdAt));

  // Since Drizzle makes joining the same table twice a bit verbose,
  // we can fetch the admins separately or use relational queries.
  const adminIds = [...new Set(activeSessions.map((s) => s.adminId!))];
  const admins = adminIds.length
    ? await db.select({ id: user.id, email: user.email, name: user.name }).from(user)
    : [];

  const adminMap = new Map(admins.map((a) => [a.id, a]));

  const enrichedSessions = activeSessions.map((s) => ({
    ...s,
    adminEmail: adminMap.get(s.adminId!)?.email || "Unknown Admin",
    adminName: adminMap.get(s.adminId!)?.name || "Unknown Admin",
  }));

  return (
    <AdminPageWrapper
      icon={ShieldCheck}
      title="Impersonation Sessions"
      description="Monitor and manage active impersonation sessions"
    >
      <ImpersonationTable sessions={enrichedSessions} />
    </AdminPageWrapper>
  );
}
