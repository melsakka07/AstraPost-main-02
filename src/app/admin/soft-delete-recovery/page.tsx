import { Trash2 } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SoftDeleteRecovery } from "@/components/admin/soft-delete-recovery";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata = { title: "Soft-Delete Recovery — Admin" };

export default async function SoftDeleteRecoveryPage() {
  await requireAdmin();

  // Fetch soft-deleted users and posts (no where clause to get both deleted and active)
  const [allUsers, allPosts] = await Promise.all([
    db.query.user.findMany({
      columns: { id: true, name: true, email: true, deletedAt: true },
    }),
    db.query.posts.findMany({
      columns: { id: true, status: true, userId: true, deletedAt: true },
    }),
  ]);

  // Filter to only deleted items (where deletedAt is NOT null)
  const actuallyDeletedUsers = allUsers.filter((u) => u.deletedAt !== null) as Array<{
    id: string;
    name: string | null;
    email: string;
    deletedAt: Date;
  }>;
  const actuallyDeletedPosts = allPosts.filter((p) => p.deletedAt !== null) as Array<{
    id: string;
    status: string;
    userId: string;
    deletedAt: Date;
  }>;

  return (
    <AdminPageWrapper
      icon={Trash2}
      title="Soft-Delete Recovery"
      description="Restore users and posts that were soft-deleted"
    >
      <SoftDeleteRecovery deletedUsers={actuallyDeletedUsers} deletedPosts={actuallyDeletedPosts} />
    </AdminPageWrapper>
  );
}
