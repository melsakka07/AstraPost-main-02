import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { session, user } from "@/lib/schema";

const banSchema = z.object({
  ban: z.boolean(), // true = ban, false = unban
});

// ── POST /api/admin/subscribers/[id]/ban ─────────────────────────────────────

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  if (id === auth.session.user.id) {
    return ApiError.badRequest("Cannot ban your own account");
  }

  const [existing] = await db
    .select({ id: user.id, deletedAt: user.deletedAt, bannedAt: user.bannedAt })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  if (!existing) return ApiError.notFound("Subscriber");
  if (existing.deletedAt) return ApiError.badRequest("Cannot ban a deleted subscriber");

  const body = await request.json().catch(() => null);
  if (!body) return ApiError.badRequest("Invalid JSON body");

  const parsed = banSchema.safeParse(body);
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  const { ban } = parsed.data;

  if (ban) {
    // Ban: set bannedAt + suspend + invalidate all sessions
    await db.transaction(async (tx) => {
      await tx.update(user).set({ bannedAt: new Date(), isSuspended: true }).where(eq(user.id, id));

      // Invalidate all active sessions
      await tx.delete(session).where(eq(session.userId, id));
    });
  } else {
    // Unban: clear bannedAt + restore suspended flag
    await db.update(user).set({ bannedAt: null, isSuspended: false }).where(eq(user.id, id));
  }

  return Response.json({ success: true, banned: ban });
}
