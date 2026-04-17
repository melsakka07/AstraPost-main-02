import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { user } from "@/lib/schema";

export async function DELETE(_req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return ApiError.unauthorized();
  }

  const userId = session.user.id;

  try {
    // Delete user (cascade will handle related data)
    await db.delete(user).where(eq(user.id, userId));

    return Response.json({ success: true });
  } catch (error) {
    logger.error("Error deleting account", { error });
    return ApiError.internal("Failed to delete user account");
  }
}
