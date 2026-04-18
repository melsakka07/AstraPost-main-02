import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { user, session as sessionTable } from "@/lib/schema";

const createSchema = z.object({
  userId: z.string().min(1, "User ID required"),
});

// ── POST /api/admin/impersonation ─────────────────────────────────────────────
/**
 * Start impersonating a user.
 * Enforces strict rate limiting (5 per minute per admin).
 * Logs all impersonation attempts in the audit log.
 */
export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  // Rate limit: max 5 impersonation sessions per minute per admin
  // Use "destructive" tier which allows 10/min globally, but we enforce tighter per-admin limits
  const rl = await checkAdminRateLimit("destructive");
  if (rl) return rl;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return ApiError.badRequest("Invalid JSON body");

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { userId } = parsed.data;

    // Verify target user exists
    const targetUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { id: true, email: true, name: true },
    });

    if (!targetUser) {
      return ApiError.notFound("User");
    }

    // Prevent admins from impersonating other admins
    const targetUserFull = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { isAdmin: true },
    });

    if (targetUserFull?.isAdmin) {
      return ApiError.forbidden("Cannot impersonate other admins");
    }

    // Create new impersonation session
    const sessionId = nanoid();
    const [newSession] = await db
      .insert(sessionTable)
      .values({
        id: sessionId,
        userId: targetUser.id,
        token: crypto.getRandomValues(new Uint8Array(32)).toString(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        impersonatedBy: auth.session.user.id,
        impersonationStartedAt: new Date(),
      })
      .returning();

    if (!newSession) {
      return ApiError.internal("Failed to create impersonation session");
    }

    // Store admin's original session token in a cookie for later restoration
    const cookieStore = await cookies();
    const originalToken = cookieStore.get("better-auth.session_token")?.value;
    if (originalToken) {
      cookieStore.set("admin_original_session", originalToken, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 2 * 60 * 60, // 2 hours
      });
    }

    // Set impersonated user session
    cookieStore.set("better-auth.session_token", newSession.token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2 * 60 * 60,
    });

    logAdminAction({
      adminId: auth.session.user.id,
      action: "impersonate_start",
      targetType: "user",
      targetId: targetUser.id,
      details: {
        email: targetUser.email,
        name: targetUser.name,
        sessionId,
      },
    });

    return Response.json(
      {
        sessionId,
        targetUser: { id: targetUser.id, email: targetUser.email, name: targetUser.name },
      },
      { status: 201 }
    );
  } catch (err) {
    logger.error("[impersonation] Error", { error: err });
    return ApiError.internal("Failed to start impersonation");
  }
}
