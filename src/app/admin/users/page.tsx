import { desc } from "drizzle-orm";
import { UsersTable } from "@/components/admin/users-table";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await db.query.user.findMany({
    orderBy: [desc(user.createdAt)],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Users Management</h1>
      <UsersTable initialUsers={users} />
    </div>
  );
}
