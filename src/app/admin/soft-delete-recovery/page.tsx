import { Trash2 } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SoftDeleteRecovery } from "@/components/admin/soft-delete-recovery";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata = { title: "Soft-Delete Recovery — Admin" };

export default async function SoftDeleteRecoveryPage() {
  await requireAdmin();

  // Fetch only soft-deleted users and posts (filter at DB level)
  const [deletedUsers, deletedPosts] = await Promise.all([
    db.query.user.findMany({
      columns: { id: true, name: true, email: true, deletedAt: true },
      where: (users, { isNotNull }) => isNotNull(users.deletedAt),
    }),
    db.query.posts.findMany({
      columns: { id: true, status: true, userId: true, deletedAt: true },
      where: (posts, { isNotNull }) => isNotNull(posts.deletedAt),
    }),
  ]);

  return (
    <AdminPageWrapper
      icon={Trash2}
      title="Soft-Delete Recovery"
      description="Restore users and posts that were soft-deleted"
    >
      <SoftDeleteRecovery
        deletedUsers={
          deletedUsers as Array<{ id: string; name: string | null; email: string; deletedAt: Date }>
        }
        deletedPosts={
          deletedPosts as Array<{ id: string; status: string; userId: string; deletedAt: Date }>
        }
      />
    </AdminPageWrapper>
  );
}
