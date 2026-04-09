import { and, count, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import {
  aiGenerations,
  instagramAccounts,
  linkedinAccounts,
  posts,
  session,
  subscriptions,
  user,
  xAccounts,
} from "@/lib/schema";

// ── PATCH body schema ────────────────────────────────────────────────────────

const patchSubscriberSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  plan: z.enum(["free", "pro_monthly", "pro_annual", "agency"]).optional(),
  isAdmin: z.boolean().optional(),
  isSuspended: z.boolean().optional(),
  timezone: z.string().max(100).optional(),
  language: z.string().max(10).optional(),
});

// ── GET /api/admin/subscribers/[id] ─────────────────────────────────────────

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const [subscriber] = await db.select().from(user).where(eq(user.id, id)).limit(1);

  if (!subscriber) return ApiError.notFound("Subscriber");

  // Subscription info
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, id)).limit(1);

  // Connected accounts
  const [xAccs, liAccs, igAccs] = await Promise.all([
    db.select().from(xAccounts).where(eq(xAccounts.userId, id)),
    db.select().from(linkedinAccounts).where(eq(linkedinAccounts.userId, id)),
    db.select().from(instagramAccounts).where(eq(instagramAccounts.userId, id)),
  ]);

  // Usage summary
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalPosts, publishedPosts, draftCount, aiThisMonth] = await Promise.all([
    db.select({ c: count() }).from(posts).where(eq(posts.userId, id)),
    db
      .select({ c: count() })
      .from(posts)
      .where(and(eq(posts.userId, id), eq(posts.status, "published"))),
    db
      .select({ c: count() })
      .from(posts)
      .where(and(eq(posts.userId, id), eq(posts.status, "draft"))),
    db
      .select({ c: count() })
      .from(aiGenerations)
      .where(and(eq(aiGenerations.userId, id), gte(aiGenerations.createdAt, monthStart))),
  ]);

  // Last 10 sessions
  const recentSessions = await db
    .select({
      id: session.id,
      createdAt: session.createdAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      expiresAt: session.expiresAt,
    })
    .from(session)
    .where(eq(session.userId, id))
    .orderBy(desc(session.createdAt))
    .limit(10);

  return Response.json({
    data: {
      subscriber,
      subscription: sub ?? null,
      connectedAccounts: {
        x: xAccs,
        linkedin: liAccs,
        instagram: igAccs,
      },
      usage: {
        totalPosts: Number(totalPosts[0]?.c ?? 0),
        publishedPosts: Number(publishedPosts[0]?.c ?? 0),
        drafts: Number(draftCount[0]?.c ?? 0),
        aiGenerationsThisMonth: Number(aiThisMonth[0]?.c ?? 0),
      },
      recentSessions,
    },
  });
}

// ── PATCH /api/admin/subscribers/[id] ───────────────────────────────────────

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const [existing] = await db
    .select({ id: user.id, deletedAt: user.deletedAt })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  if (!existing) return ApiError.notFound("Subscriber");
  if (existing.deletedAt) return ApiError.badRequest("Cannot edit a deleted subscriber");

  // Prevent editing self (for safety on role/plan changes)
  if (id === auth.session.user.id) {
    return ApiError.badRequest("Use your profile settings to edit your own account");
  }

  const body = await request.json().catch(() => null);
  if (!body) return ApiError.badRequest("Invalid JSON body");

  const parsed = patchSubscriberSchema.safeParse(body);
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  if (Object.keys(parsed.data).length === 0) {
    return ApiError.badRequest("No fields to update");
  }

  await db.update(user).set(parsed.data).where(eq(user.id, id));

  const [updated] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  return Response.json({ data: updated });
}

// ── DELETE /api/admin/subscribers/[id] ──────────────────────────────────────

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  if (id === auth.session.user.id) {
    return ApiError.badRequest("Cannot delete your own account");
  }

  const [existing] = await db
    .select({ id: user.id, deletedAt: user.deletedAt })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  if (!existing) return ApiError.notFound("Subscriber");
  if (existing.deletedAt) return ApiError.conflict("Subscriber is already deleted");

  // Soft-delete + anonymise PII inside a transaction
  await db.transaction(async (tx) => {
    const timestamp = new Date();
    const anonymisedEmail = `deleted_${id}@removed.invalid`;

    await tx
      .update(user)
      .set({
        deletedAt: timestamp,
        email: anonymisedEmail,
        name: "Deleted User",
        image: null,
        isSuspended: true,
      })
      .where(eq(user.id, id));

    // Invalidate all sessions
    await tx.delete(session).where(eq(session.userId, id));
  });

  return Response.json({ success: true });
}
