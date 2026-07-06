import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getUserPlanType } from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { xAccounts } from "@/lib/schema";
import { getInboxItems, refreshInboxForAccount } from "@/lib/services/inbox";
import { getTeamContext } from "@/lib/team-context";

// ── GET /api/inbox — List inbox items ───────────────────────────────────────────

const listQuerySchema = z.object({
  accountId: z.string().optional(),
  type: z.enum(["mention", "reply", "quote"]).optional(),
  isRead: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  isArchived: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((v) => v === "true"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: Request) {
  try {
    // 1. Auth
    const ctx = await getTeamContext();
    if (!ctx) {
      return ApiError.unauthorized();
    }

    // 2. Role check — viewers allowed for reads
    // (no block needed)

    // 3. Parse query params
    const url = new URL(req.url);
    const rawParams: Record<string, string | undefined> = {};
    url.searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });
    const parsed = listQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const { accountId, type, isRead, isArchived, cursor, limit } = parsed.data;

    // 4. Rate limit — read bucket (60s window, cheap DB query)
    const rlResult = await checkRateLimit(
      ctx.currentTeamId,
      await getUserPlanType(ctx.currentTeamId),
      "inbox_read"
    );
    if (!rlResult.success) return createRateLimitResponse(rlResult);

    // 5. Verify accountId belongs to user if provided
    if (accountId) {
      const account = await db.query.xAccounts.findFirst({
        where: and(eq(xAccounts.id, accountId), eq(xAccounts.userId, ctx.currentTeamId)),
        columns: { id: true },
      });
      if (!account) {
        return ApiError.notFound("X account not found");
      }
    }

    // 6. Business logic
    const correlationId = getCorrelationId(req);
    logger.info("api_request", {
      route: "/api/inbox",
      method: "GET",
      correlationId,
      userId: ctx.currentTeamId,
      actorId: ctx.isOwner ? undefined : ctx.session.user.id,
    });

    const result = await getInboxItems({
      userId: ctx.currentTeamId,
      ...(accountId !== undefined && { xAccountId: accountId }),
      ...(type !== undefined && { type }),
      ...(isRead !== undefined && { isRead }),
      isArchived,
      ...(cursor !== undefined && { cursor }),
      limit,
    });

    const res = Response.json(result);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("inbox_list_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to fetch inbox items");
  }
}

// ── POST /api/inbox — Refresh inbox from X API ──────────────────────────────────

const refreshBodySchema = z.object({
  accountId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // 1. Auth
    const ctx = await getTeamContext();
    if (!ctx) {
      return ApiError.unauthorized();
    }

    // 2. Role check — viewers cannot trigger refresh
    if (ctx.role === "viewer") {
      return ApiError.forbidden("Viewers cannot refresh the inbox");
    }

    // 3. Rate limit — refresh bucket (hourly, each refresh hits the X API)
    const rlResult = await checkRateLimit(
      ctx.currentTeamId,
      await getUserPlanType(ctx.currentTeamId),
      "inbox_refresh"
    );
    if (!rlResult.success) return createRateLimitResponse(rlResult);

    // 4. Correlation ID
    const correlationId = getCorrelationId(req);
    logger.info("api_request", {
      route: "/api/inbox",
      method: "POST",
      correlationId,
      userId: ctx.currentTeamId,
      actorId: ctx.isOwner ? undefined : ctx.session.user.id,
    });

    // 5. Parse body
    const json = await req.json();
    const parsed = refreshBodySchema.safeParse(json);
    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    // 6. Get active X accounts
    const conditions = [eq(xAccounts.userId, ctx.currentTeamId), eq(xAccounts.isActive, true)];
    if (parsed.data.accountId) {
      conditions.push(eq(xAccounts.id, parsed.data.accountId));
    }

    const accounts = await db.query.xAccounts.findMany({
      where: and(...conditions),
      columns: { id: true, xUserId: true },
    });

    if (accounts.length === 0) {
      return ApiError.badRequest("No active X accounts found");
    }

    // 7. Refresh each account
    let totalNewItems = 0;
    for (const account of accounts) {
      const result = await refreshInboxForAccount(account.id, ctx.currentTeamId, account.xUserId);
      totalNewItems += result.newItems;
    }

    // 8. Return (note: no queue jobs to enqueue for inbox refresh)
    const res = Response.json({
      newItems: totalNewItems,
      accountsChecked: accounts.length,
    });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "X_SESSION_EXPIRED") {
      return ApiError.badRequest(
        "X account connection expired — please reconnect it from Settings",
        "X_SESSION_EXPIRED"
      );
    }
    logger.error("inbox_refresh_failed", { error: message });
    return ApiError.internal("Failed to refresh inbox");
  }
}
