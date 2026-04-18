import { isNull } from "drizzle-orm";
import { posts, user } from "@/lib/schema";

/**
 * Filter clause for querying only non-deleted posts.
 * Use in where clauses: `where(and(eq(...), POSTS_NOT_DELETED))`
 */
export const POSTS_NOT_DELETED = isNull(posts.deletedAt);

/**
 * Filter clause for querying only non-deleted users.
 * Use in where clauses: `where(and(eq(...), USERS_NOT_DELETED))`
 */
export const USERS_NOT_DELETED = isNull(user.deletedAt);

/**
 * Soft-deletes a post by setting its deletedAt timestamp.
 * Does NOT hard-delete from DB — allows admin recovery.
 */
export async function softDeletePost(
  db: any,
  postId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await db
      .update(posts)
      .set({
        deletedAt: new Date(),
        // Optionally track who deleted it (could add deletedBy column)
      })
      .where({ id: postId });

    return { success: true, message: `Post ${postId} soft-deleted` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Soft-deletes a user by setting their deletedAt timestamp.
 * Does NOT hard-delete from DB — allows admin recovery.
 */
export async function softDeleteUser(
  db: any,
  userId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await db
      .update(user)
      .set({
        deletedAt: new Date(),
        // Optionally track who deleted it (could add deletedBy column)
      })
      .where({ id: userId });

    return { success: true, message: `User ${userId} soft-deleted` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Restores a soft-deleted post by clearing its deletedAt timestamp.
 * Admin recovery mechanism.
 */
export async function restorePost(
  db: any,
  postId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await db.update(posts).set({ deletedAt: null }).where({ id: postId });

    return { success: true, message: `Post ${postId} restored` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Restores a soft-deleted user by clearing their deletedAt timestamp.
 * Admin recovery mechanism.
 */
export async function restoreUser(
  db: any,
  userId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await db.update(user).set({ deletedAt: null }).where({ id: userId });

    return { success: true, message: `User ${userId} restored` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
