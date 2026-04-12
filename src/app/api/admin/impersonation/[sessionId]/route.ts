import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { session as sessionTable } from "@/lib/schema";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const cookieStore = await cookies();
  const originalToken = cookieStore.get("admin_original_session")?.value;
  let adminSession = null;

  try {
    if (originalToken) {
      // If called from the impersonation banner by the impersonator
      const reqHeaders = new Headers(await headers());
      reqHeaders.set("cookie", `better-auth.session_token=${originalToken}`);
      adminSession = await auth.api.getSession({ headers: reqHeaders });
    } else {
      // If called from the admin panel by an admin directly
      adminSession = await auth.api.getSession({ headers: await headers() });
    }

    if (!adminSession || !(adminSession.user as any).isAdmin) {
      return ApiError.forbidden("Admin access required");
    }

    const rl = await checkAdminRateLimit("destructive");
    if (rl) return rl;

    const { sessionId } = await params;

    if (!sessionId) {
      return ApiError.badRequest("Session ID required");
    }

    // Fetch the session
    const [targetSession] = await db
      .select()
      .from(sessionTable)
      .where(eq(sessionTable.id, sessionId));

    if (!targetSession) {
      return ApiError.notFound("Session");
    }

    if (!targetSession.impersonatedBy) {
      return ApiError.badRequest("Not an impersonation session");
    }

    // Delete the session to revoke access
    await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));

    // Restore the admin session if called by the impersonator
    if (
      originalToken &&
      cookieStore.get("better-auth.session_token")?.value === targetSession.token
    ) {
      cookieStore.set("better-auth.session_token", originalToken, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
      cookieStore.delete("admin_original_session");
    }

    logAdminAction({
      adminId: adminSession.user.id,
      action: "impersonate_end",
      targetType: "user",
      targetId: targetSession.userId,
      details: { sessionId },
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[impersonation] Error:", err);
    return ApiError.internal("Failed to end impersonation");
  }
}
