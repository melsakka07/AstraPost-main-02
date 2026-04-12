import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { session, user } from "@/lib/schema";

// BetterAuth exposes `createSession` internally but does not include it in
// the public type surface. We declare the minimal shape we need rather than
// using @ts-ignore, so that any future signature change produces a compile
// error here instead of silently breaking at runtime.
type AdminAuthApi = typeof auth.api & {
  createSession: (opts: {
    userId: string;
    headers: Headers;
  }) => Promise<{ token?: string; session?: { token?: string } } | null>;
};

export async function POST(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("destructive");
  if (rl) return rl;

  try {
    const { userId } = await params;

    if (!userId) {
      return ApiError.badRequest("User ID required");
    }

    const [targetUser] = await db.select().from(user).where(eq(user.id, userId));

    if (!targetUser) {
      return ApiError.notFound("User");
    }

    // Cast to AdminAuthApi so TypeScript enforces the call signature —
    // safer than @ts-ignore which would suppress all errors on the line.
    const adminApi = auth as unknown as AdminAuthApi;
    const newSession = await adminApi.createSession({
      userId,
      headers: await headers(),
    });

    if (!newSession) {
      return ApiError.internal("Failed to create session");
    }

    const token = newSession.token ?? newSession.session?.token;

    if (token) {
      const cookieStore = await cookies();
      const currentToken = cookieStore.get("better-auth.session_token")?.value;

      // Save the original admin session to restore later
      if (currentToken && !cookieStore.get("admin_original_session")?.value) {
        cookieStore.set("admin_original_session", currentToken, {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });
      }

      // Tag the session with the impersonating admin's ID
      await db
        .update(session)
        .set({ impersonatedBy: auth.session.user.id })
        .where(eq(session.token, token));

      cookieStore.set("better-auth.session_token", token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });
    }

    logAdminAction({
      adminId: auth.session.user.id,
      action: "impersonate_start",
      targetType: "user",
      targetId: userId,
      details: { targetEmail: targetUser.email },
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[impersonate] Error:", err);
    return ApiError.internal("Failed to start impersonation");
  }
}
