import { and, count, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { getPlanLimits } from "@/lib/plan-limits";
import {
  aiGenerations,
  instagramAccounts,
  linkedinAccounts,
  planChangeLog,
  posts,
  session,
  subscriptions,
  teamMembers,
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

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const { id } = await params;

    const [subscriber] = await db.select().from(user).where(eq(user.id, id)).limit(1);

    if (!subscriber) return ApiError.notFound("Subscriber");

    // Subscription info
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, id))
      .limit(1);

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

    // ── Additional data: AI quota, referrals, teams, activity timeline, OAuth health ──

    // 1. AI quota status
    const limits = getPlanLimits(subscriber.plan);
    const aiUsed = Number(aiThisMonth[0]?.c ?? 0);
    const aiLimit = limits.aiGenerationsPerMonth;
    const aiQuota = {
      used: aiUsed,
      limit: aiLimit === Infinity || aiLimit === -1 ? "unlimited" : aiLimit,
      percentage: aiLimit === Infinity || aiLimit === -1 ? 0 : Math.round((aiUsed / aiLimit) * 100),
    };

    // 2. Referral data
    const [referredUsersResult, referralCountResult] = await Promise.all([
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.referredBy, id)),
      db.select({ c: count() }).from(user).where(eq(user.referredBy, id)),
    ]);

    const referralCount = Number(referralCountResult[0]?.c ?? 0);
    const totalCreditsIssued = referralCount * 1; // Assuming 1 credit per referral (adjust if needed)

    const referrals = {
      referralCode: subscriber.referralCode ?? null,
      referredUsers: referredUsersResult,
      referralCredits: subscriber.referralCredits ?? 0,
      referralCount,
      totalCreditsIssued,
    };

    // 3. Team memberships
    const teamMemberships = await db
      .select({
        id: teamMembers.id,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        teamId: teamMembers.teamId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, id));

    // Fetch team owner details for each membership
    const teams = await Promise.all(
      teamMemberships.map(async (membership) => {
        const [teamOwner] = await db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
          })
          .from(user)
          .where(eq(user.id, membership.teamId))
          .limit(1);

        return {
          id: membership.id,
          role: membership.role,
          joinedAt: membership.joinedAt,
          team: teamOwner ?? null,
        };
      })
    );

    // 4. Activity timeline (last 20 actions)
    const [recentPosts, recentAiGenerations, recentPlanChanges] = await Promise.all([
      db
        .select({
          id: posts.id,
          createdAt: posts.createdAt,
          status: posts.status,
        })
        .from(posts)
        .where(eq(posts.userId, id))
        .orderBy(desc(posts.createdAt))
        .limit(10),
      db
        .select({
          id: aiGenerations.id,
          createdAt: aiGenerations.createdAt,
          type: aiGenerations.type,
        })
        .from(aiGenerations)
        .where(eq(aiGenerations.userId, id))
        .orderBy(desc(aiGenerations.createdAt))
        .limit(10),
      db
        .select({
          id: planChangeLog.id,
          createdAt: planChangeLog.createdAt,
          oldPlan: planChangeLog.oldPlan,
          newPlan: planChangeLog.newPlan,
          reason: planChangeLog.reason,
        })
        .from(planChangeLog)
        .where(eq(planChangeLog.userId, id))
        .orderBy(desc(planChangeLog.createdAt))
        .limit(10),
    ]);

    // Merge and sort activity timeline
    const activityTimeline = [
      ...recentPosts.map((p) => ({
        type: "post" as const,
        id: p.id,
        createdAt: p.createdAt,
        status: p.status,
      })),
      ...recentAiGenerations.map((ai) => ({
        type: "ai_generation" as const,
        id: ai.id,
        createdAt: ai.createdAt,
        prompt: ai.type,
      })),
      ...recentPlanChanges.map((pc) => ({
        type: "plan_change" as const,
        id: pc.id,
        createdAt: pc.createdAt,
        oldPlan: pc.oldPlan,
        newPlan: pc.newPlan,
        reason: pc.reason,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);

    // 5. OAuth token health
    const checkTokenHealth = (expiresAt: Date | null, accessToken: string | null) => {
      if (!accessToken) return "expired";
      if (!expiresAt) return "healthy";
      const expiryBuffer = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
      if (expiresAt.getTime() < now.getTime()) return "expired";
      if (expiresAt.getTime() < now.getTime() + expiryBuffer) return "expiring_soon";
      return "healthy";
    };

    const enhancedConnectedAccounts = {
      x: xAccs.map((acc) => ({
        ...acc,
        health: checkTokenHealth(acc.tokenExpiresAt, acc.accessToken),
      })),
      linkedin: liAccs.map((acc) => ({
        ...acc,
        health: checkTokenHealth(acc.tokenExpiresAt, acc.accessToken),
      })),
      instagram: igAccs.map((acc) => ({
        ...acc,
        health: checkTokenHealth(acc.tokenExpiresAt, acc.accessToken),
      })),
    };

    return Response.json({
      data: {
        subscriber,
        subscription: sub ?? null,
        connectedAccounts: enhancedConnectedAccounts,
        usage: {
          totalPosts: Number(totalPosts[0]?.c ?? 0),
          publishedPosts: Number(publishedPosts[0]?.c ?? 0),
          drafts: Number(draftCount[0]?.c ?? 0),
          aiGenerationsThisMonth: Number(aiThisMonth[0]?.c ?? 0),
        },
        recentSessions,
        aiQuota,
        referrals,
        teams,
        activityTimeline,
      },
    });
  } catch (err) {
    console.error("[subscribers] Error:", err);
    return ApiError.internal("Failed to load subscriber details");
  }
}

// ── PATCH /api/admin/subscribers/[id] ───────────────────────────────────────

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("write");
  if (rl) return rl;

  try {
    const { id } = await params;

    const [existing] = await db
      .select({ id: user.id, deletedAt: user.deletedAt, plan: user.plan })
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

    // Handle plan change logging if plan is being updated
    const updates: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.plan !== undefined && parsed.data.plan !== existing.plan) {
      await db.insert(planChangeLog).values({
        id: crypto.randomUUID(),
        userId: id,
        oldPlan: existing.plan,
        newPlan: parsed.data.plan,
        reason: "admin",
      });
    }

    await db.update(user).set(updates).where(eq(user.id, id));

    const [updated] = await db.select().from(user).where(eq(user.id, id)).limit(1);

    logAdminAction({
      adminId: auth.session.user.id,
      action: "subscriber_update",
      targetType: "user",
      targetId: id,
      details: updates,
    });

    return Response.json({ data: updated });
  } catch (err) {
    console.error("[subscribers] Error:", err);
    return ApiError.internal("Failed to update subscriber");
  }
}

// ── DELETE /api/admin/subscribers/[id] ──────────────────────────────────────

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("destructive");
  if (rl) return rl;

  try {
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

    logAdminAction({
      adminId: auth.session.user.id,
      action: "delete_user",
      targetType: "user",
      targetId: id,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[subscribers] Error:", err);
    return ApiError.internal("Failed to delete subscriber");
  }
}
