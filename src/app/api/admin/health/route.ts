import { count, eq, gte, and, sql } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { connection as redis } from "@/lib/queue/client";
import {
  xAccounts,
  linkedinAccounts,
  instagramAccounts,
  subscriptions,
  jobRuns,
} from "@/lib/schema";

// ── GET /api/admin/health ─────────────────────────────────────────────────────

type HealthCheckResult = {
  ok: boolean;
  latency: number;
  error?: string;
};

async function checkPostgres(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    await db.select({ value: count() }).from(subscriptions).limit(1);
    return { ok: true, latency: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latency: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkRedis(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    await redis.ping();
    return { ok: true, latency: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latency: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkBullMQ(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    // Check if queue is responsive by pinging the queue's Redis connection
    await redis.ping();
    return { ok: true, latency: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latency: Date.now() - start,
      error: err instanceof Error ? err.message : "Redis unavailable",
    };
  }
}

async function checkStripeApi(): Promise<HealthCheckResult> {
  const start = Date.now();
  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, latency: 0, error: "Stripe not configured" };
  }
  try {
    const response = await fetch("https://api.stripe.com/v1/account", {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      return { ok: true, latency: Date.now() - start };
    }
    return {
      ok: false,
      latency: Date.now() - start,
      error: `Stripe API returned ${response.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      latency: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkOpenRouterApi(): Promise<HealthCheckResult> {
  const start = Date.now();
  if (!process.env.OPENROUTER_API_KEY) {
    return { ok: false, latency: 0, error: "OpenRouter not configured" };
  }
  try {
    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      return { ok: true, latency: Date.now() - start };
    }
    return {
      ok: false,
      latency: Date.now() - start,
      error: `OpenRouter API returned ${response.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      latency: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Perform all health checks in parallel
  const [pgResult, redisResult, bullmqResult, stripeResult, openrouterResult] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkBullMQ(),
    checkStripeApi(),
    checkOpenRouterApi(),
  ]);

  // Determine overall status
  const criticalChecks = [pgResult, redisResult, bullmqResult];
  const allChecks = [pgResult, redisResult, bullmqResult, stripeResult, openrouterResult];
  const criticalOk = criticalChecks.every((c) => c.ok);
  const allOk = allChecks.every((c) => c.ok);

  let status: "ok" | "degraded" | "critical";
  if (criticalOk && allOk) {
    status = "ok";
  } else if (criticalOk) {
    status = "degraded";
  } else {
    status = "critical";
  }

  // Log critical status for monitoring
  if (status !== "ok") {
    logger.warn("health_check_failed", {
      status,
      postgres: pgResult.ok,
      redis: redisResult.ok,
      bullmq: bullmqResult.ok,
      stripe: stripeResult.ok,
      openrouter: openrouterResult.ok,
    });
  }

  // Environment variables check (presence only, never expose values)
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

  const httpStatus = status === "critical" ? 503 : 200;

  return Response.json(
    {
      status,
      checks: {
        postgres: pgResult,
        redis: redisResult,
        bullmq: bullmqResult,
        stripe: stripeResult,
        openrouter: openrouterResult,
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
    {
      status: httpStatus,
      headers: { "X-Health-Status": status },
    }
  );
}
