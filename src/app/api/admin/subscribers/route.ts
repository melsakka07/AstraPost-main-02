import { and, asc, count, desc, eq, gt, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  planChangeLog,
  subscriptions,
  user,
  xAccounts,
  linkedinAccounts,
  instagramAccounts,
} from "@/lib/schema";

// ── Query params schema ───────────────────────────────────────────────────────

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().max(200).optional(),
  filter: z
    .enum(["all", "free", "trial", "pro_monthly", "pro_annual", "agency", "banned", "deleted"])
    .default("all"),
  sort: z.enum(["createdAt", "plan"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// ── POST body schema ─────────────────────────────────────────────────────────

const createSubscriberSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  plan: z.enum(["free", "pro_monthly", "pro_annual", "agency"]).default("free"),
  isAdmin: z.boolean().default(false),
});

// ── GET /api/admin/subscribers ───────────────────────────────────────────────

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { page, limit, search, filter, sort, order } = parsed.data;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [isNull(user.deletedAt)]; // exclude hard-deleted by default

    if (filter === "deleted") {
      // Show deleted users specifically
      conditions.splice(0); // clear; no isNull filter
      conditions.push(sql`${user.deletedAt} IS NOT NULL`);
    } else if (filter === "banned") {
      conditions.push(sql`${user.bannedAt} IS NOT NULL`);
    } else if (filter === "trial") {
      const now = new Date();
      conditions.push(gt(user.trialEndsAt, now));
      conditions.push(eq(user.plan, "free"));
    } else if (filter !== "all") {
      conditions.push(eq(user.plan, filter as "free" | "pro_monthly" | "pro_annual" | "agency"));
    }

    if (search) {
      conditions.push(or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))!);
    }

    const where = and(...conditions);

    // Sort
    const orderBy =
      sort === "plan"
        ? order === "asc"
          ? asc(user.plan)
          : desc(user.plan)
        : order === "asc"
          ? asc(user.createdAt)
          : desc(user.createdAt);

    // Count
    const countResult = await db.select({ total: count() }).from(user).where(where);
    const total = countResult[0]?.total ?? 0;

    // Fetch page
    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        plan: user.plan,
        isAdmin: user.isAdmin,
        isSuspended: user.isSuspended,
        bannedAt: user.bannedAt,
        deletedAt: user.deletedAt,
        trialEndsAt: user.trialEndsAt,
        stripeCustomerId: user.stripeCustomerId,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Enrich with connected platform counts and subscription status (bulk queries)
    const userIds = rows.map((u) => u.id);

    const [xCounts, liCounts, igCounts, subscriptionsData] = await Promise.all([
      userIds.length > 0
        ? db
            .select({ userId: xAccounts.userId, cnt: count(xAccounts.id) })
            .from(xAccounts)
            .where(and(inArray(xAccounts.userId, userIds), eq(xAccounts.isActive, true)))
            .groupBy(xAccounts.userId)
        : Promise.resolve([]),
      userIds.length > 0
        ? db
            .select({ userId: linkedinAccounts.userId, cnt: count(linkedinAccounts.id) })
            .from(linkedinAccounts)
            .where(
              and(inArray(linkedinAccounts.userId, userIds), eq(linkedinAccounts.isActive, true))
            )
            .groupBy(linkedinAccounts.userId)
        : Promise.resolve([]),
      userIds.length > 0
        ? db
            .select({ userId: instagramAccounts.userId, cnt: count(instagramAccounts.id) })
            .from(instagramAccounts)
            .where(
              and(inArray(instagramAccounts.userId, userIds), eq(instagramAccounts.isActive, true))
            )
            .groupBy(instagramAccounts.userId)
        : Promise.resolve([]),
      userIds.length > 0
        ? db
            .select({ userId: subscriptions.userId, status: subscriptions.status })
            .from(subscriptions)
            .where(inArray(subscriptions.userId, userIds))
        : Promise.resolve([]),
    ]);

    const xMap = new Map(xCounts.map((p) => [p.userId, Number(p.cnt)]));
    const liMap = new Map(liCounts.map((p) => [p.userId, Number(p.cnt)]));
    const igMap = new Map(igCounts.map((p) => [p.userId, Number(p.cnt)]));
    const subMap = new Map(subscriptionsData.map((s) => [s.userId, s.status]));

    const enriched = rows.map((u) => ({
      ...u,
      connectedPlatforms: (xMap.get(u.id) ?? 0) + (liMap.get(u.id) ?? 0) + (igMap.get(u.id) ?? 0),
      subscriptionStatus: subMap.get(u.id) ?? null,
    }));

    return Response.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (err) {
    logger.error("[subscribers] Error", { error: err });
    return ApiError.internal("Failed to load subscribers");
  }
}

// ── POST /api/admin/subscribers ──────────────────────────────────────────────

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("write");
  if (rl) return rl;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return ApiError.badRequest("Invalid JSON body");

    const parsed = createSubscriberSchema.safeParse(body);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { name, email, password, plan, isAdmin: makeAdmin } = parsed.data;

    // Check if email already exists
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existing.length > 0) return ApiError.conflict("A user with that email already exists");

    // Create via Better Auth to handle password hashing
    const { auth: authInstance } = await import("@/lib/auth");
    const signUpResult = await authInstance.api.signUpEmail({
      body: { email, password, name },
    });

    if (!signUpResult || !signUpResult.user) {
      return ApiError.internal("Failed to create user account");
    }

    const newUserId = signUpResult.user.id;

    // Apply extra fields (plan, admin)
    await db.update(user).set({ plan, isAdmin: makeAdmin }).where(eq(user.id, newUserId));

    await db.insert(planChangeLog).values({
      id: crypto.randomUUID(),
      userId: newUserId,
      oldPlan: null,
      newPlan: plan,
      reason: "admin",
    });

    const [created] = await db.select().from(user).where(eq(user.id, newUserId)).limit(1);

    logAdminAction({
      adminId: auth.session.user.id,
      action: "subscriber_create",
      targetType: "user",
      targetId: newUserId,
      details: { name, email, plan, isAdmin: makeAdmin },
    });

    return Response.json({ data: created }, { status: 201 });
  } catch (err) {
    logger.error("[subscribers] Error", { error: err });
    return ApiError.internal("Failed to create subscriber");
  }
}
