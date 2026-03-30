import { headers } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { xAccounts } from "@/lib/schema";
import { XApiService } from "@/lib/services/x-api";

const COOLDOWN_THRESHOLD_MS = 15 * 60 * 1000;

const bodySchema = z.object({
  accountIds: z.array(z.string().uuid("Invalid account ID format")).min(1).max(10),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return ApiError.badRequest(parsed.error.issues);
  }

  const { accountIds } = parsed.data;

  const accounts = await db.query.xAccounts.findMany({
    where: and(
      inArray(xAccounts.id, accountIds),
      eq(xAccounts.userId, session.user.id)
    ),
    columns: {
      id: true,
      xSubscriptionTier: true,
      xSubscriptionTierUpdatedAt: true,
    },
  });

  if (accounts.length === 0) {
    return ApiError.notFound("X accounts");
  }

  const foundIds = new Set(accounts.map((a) => a.id));
  const missingIds = accountIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    return ApiError.forbidden(`Access denied for account(s): ${missingIds.join(", ")}`);
  }

  const now = Date.now();
  const results: Array<{
    accountId: string;
    tier: string | null;
    updatedAt: string | null;
    status: "refreshed" | "skipped_cooldown" | "error";
    error?: string;
  }> = [];

  for (const account of accounts) {
    const lastUpdated = account.xSubscriptionTierUpdatedAt?.getTime() ?? 0;
    const timeSinceUpdate = now - lastUpdated;

    if (timeSinceUpdate < COOLDOWN_THRESHOLD_MS) {
      results.push({
        accountId: account.id,
        tier: account.xSubscriptionTier ?? "None",
        updatedAt: account.xSubscriptionTierUpdatedAt?.toISOString() ?? null,
        status: "skipped_cooldown",
      });
      continue;
    }

    try {
      const tier = await XApiService.fetchXSubscriptionTier(account.id);
      results.push({
        accountId: account.id,
        tier,
        updatedAt: new Date().toISOString(),
        status: "refreshed",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error("x_subscription_tier_refresh_error", {
        accountId: account.id,
        error: message,
      });

      results.push({
        accountId: account.id,
        tier: account.xSubscriptionTier ?? null,
        updatedAt: account.xSubscriptionTierUpdatedAt?.toISOString() ?? null,
        status: "error",
        error: message,
      });
    }
  }

  const refreshed = results.filter((r) => r.status === "refreshed").length;
  const skipped = results.filter((r) => r.status === "skipped_cooldown").length;
  const errors = results.filter((r) => r.status === "error").length;

  logger.info("x_subscription_tier_batch_refresh", {
    userId: session.user.id,
    total: accountIds.length,
    refreshed,
    skipped,
    errors,
  });

  return Response.json({
    results,
    summary: {
      total: accountIds.length,
      refreshed,
      skipped,
      errors,
    },
  });
}
