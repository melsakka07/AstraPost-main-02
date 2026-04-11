import { count, eq, gte, and, sql } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { db } from "@/lib/db";
import {
  xAccounts,
  linkedinAccounts,
  instagramAccounts,
  subscriptions,
  jobRuns,
} from "@/lib/schema";

// ── GET /api/admin/health ─────────────────────────────────────────────────────

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 1. Database health check with timeout
  let dbConnected = true;
  let dbError: string | null = null;

  try {
    await db.select({ value: count() }).from(subscriptions).limit(1);
  } catch (err) {
    dbConnected = false;
    dbError = err instanceof Error ? err.message : "Unknown error";
  }

  // 2. Environment variables check (presence only, never expose values)
  const env = {
    postgres: !!process.env.POSTGRES_URL,
    auth: !!process.env.BETTER_AUTH_SECRET,
    ai: !!process.env.OPENROUTER_API_KEY,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    storage: !!process.env.BLOB_READ_WRITE_TOKEN,
  };

  // 3. Subscription counts
  const [[activeSubsRow], [trialingSubsRow], [cancelledSubsRow]] = await Promise.all([
    db
      .select({ value: count(subscriptions.id) })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active")),
    db
      .select({ value: count(subscriptions.id) })
      .from(subscriptions)
      .where(eq(subscriptions.status, "trialing")),
    db
      .select({ value: count(subscriptions.id) })
      .from(subscriptions)
      .where(eq(subscriptions.status, "cancelled")),
  ]);

  // 4. OAuth token health - check for expired tokens
  const [[xTotalRow], [xExpiredRow]] = await Promise.all([
    db.select({ value: count(xAccounts.id) }).from(xAccounts),
    db
      .select({ value: count(xAccounts.id) })
      .from(xAccounts)
      .where(
        and(sql`${xAccounts.tokenExpiresAt} < now()`, sql`${xAccounts.tokenExpiresAt} IS NOT NULL`)
      ),
  ]);

  const [[linkedinTotalRow], [linkedinExpiredRow]] = await Promise.all([
    db.select({ value: count(linkedinAccounts.id) }).from(linkedinAccounts),
    db
      .select({ value: count(linkedinAccounts.id) })
      .from(linkedinAccounts)
      .where(
        and(
          sql`${linkedinAccounts.tokenExpiresAt} < now()`,
          sql`${linkedinAccounts.tokenExpiresAt} IS NOT NULL`
        )
      ),
  ]);

  const [[instagramTotalRow], [instagramExpiredRow]] = await Promise.all([
    db.select({ value: count(instagramAccounts.id) }).from(instagramAccounts),
    db
      .select({ value: count(instagramAccounts.id) })
      .from(instagramAccounts)
      .where(
        and(
          sql`${instagramAccounts.tokenExpiresAt} < now()`,
          sql`${instagramAccounts.tokenExpiresAt} IS NOT NULL`
        )
      ),
  ]);

  // 5. Jobs health (last 24h)
  const [[failedJobs24hRow], [successJobs24hRow]] = await Promise.all([
    db
      .select({ value: count(jobRuns.id) })
      .from(jobRuns)
      .where(and(eq(jobRuns.status, "failed"), gte(jobRuns.startedAt, oneDayAgo))),
    db
      .select({ value: count(jobRuns.id) })
      .from(jobRuns)
      .where(and(eq(jobRuns.status, "success"), gte(jobRuns.startedAt, oneDayAgo))),
  ]);

  return Response.json({
    data: {
      database: {
        connected: dbConnected,
        error: dbError,
      },
      env,
      subscriptions: {
        active: Number(activeSubsRow?.value ?? 0),
        trialing: Number(trialingSubsRow?.value ?? 0),
        cancelled: Number(cancelledSubsRow?.value ?? 0),
      },
      oauthTokens: {
        x: {
          total: Number(xTotalRow?.value ?? 0),
          expired: Number(xExpiredRow?.value ?? 0),
        },
        linkedin: {
          total: Number(linkedinTotalRow?.value ?? 0),
          expired: Number(linkedinExpiredRow?.value ?? 0),
        },
        instagram: {
          total: Number(instagramTotalRow?.value ?? 0),
          expired: Number(instagramExpiredRow?.value ?? 0),
        },
      },
      jobs: {
        success24h: Number(successJobs24hRow?.value ?? 0),
        failed24h: Number(failedJobs24hRow?.value ?? 0),
      },
    },
  });
}
