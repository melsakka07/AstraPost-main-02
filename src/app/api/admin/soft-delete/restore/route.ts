import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { posts, user } from "@/lib/schema";

const restoreSchema = z.object({
  type: z.enum(["user", "post"]),
  id: z.string().min(1),
});

/**
 * Restore a soft-deleted user or post.
 * Admin-only endpoint for recovery mechanism.
 */
export async function POST(req: Request) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.response;

  const parsed = restoreSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  const { type, id } = parsed.data;

  logger.info("soft_delete_restore_initiated", {
    type,
    id,
    adminId: admin.session.user.id,
  });

  try {
    if (type === "user") {
      // Check if user exists and is soft-deleted
      const deletedUser = await db.query.user.findFirst({
        where: eq(user.id, id),
        columns: { id: true, email: true, deletedAt: true, name: true },
      });

      if (!deletedUser) {
        return ApiError.notFound("User not found");
      }

      if (!deletedUser.deletedAt) {
        return ApiError.badRequest("User is not deleted");
      }

      // Restore the user
      await db.update(user).set({ deletedAt: null }).where(eq(user.id, id));

      logger.info("soft_delete_restore_success", {
        type: "user",
        id,
        email: deletedUser.email,
        adminId: admin.session.user.id,
      });

      return Response.json({
        success: true,
        message: `User ${deletedUser.name || deletedUser.email} has been restored`,
        type: "user",
        id,
      });
    }

    if (type === "post") {
      // Check if post exists and is soft-deleted
      const deletedPost = await db.query.posts.findFirst({
        where: eq(posts.id, id),
        columns: { id: true, deletedAt: true, status: true, userId: true },
      });

      if (!deletedPost) {
        return ApiError.notFound("Post not found");
      }

      if (!deletedPost.deletedAt) {
        return ApiError.badRequest("Post is not deleted");
      }

      // Restore the post
      await db.update(posts).set({ deletedAt: null }).where(eq(posts.id, id));

      logger.info("soft_delete_restore_success", {
        type: "post",
        id,
        status: deletedPost.status,
        userId: deletedPost.userId,
        adminId: admin.session.user.id,
      });

      return Response.json({
        success: true,
        message: `Post ${id} (${deletedPost.status}) has been restored`,
        type: "post",
        id,
      });
    }

    return ApiError.badRequest("Invalid restore type");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    logger.error("soft_delete_restore_failed", {
      type,
      id,
      adminId: admin.session.user.id,
      error: errorMsg,
    });

    return ApiError.internal(errorMsg);
  }
}
