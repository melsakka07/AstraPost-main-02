import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { xAccounts } from "@/lib/schema";
import { XApiService } from "@/lib/services/x-api";

const querySchema = z.object({
  accountId: z.string().uuid("Invalid account ID format"),
});

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    accountId: searchParams.get("accountId"),
  });

  if (!parsed.success) {
    return ApiError.badRequest(parsed.error.issues);
  }

  const { accountId } = parsed.data;

  const account = await db.query.xAccounts.findFirst({
    where: and(eq(xAccounts.id, accountId), eq(xAccounts.userId, session.user.id)),
    columns: {
      id: true,
      xSubscriptionTier: true,
      xSubscriptionTierUpdatedAt: true,
    },
  });

  if (!account) {
    return ApiError.notFound("X account");
  }

  const now = Date.now();
  const lastUpdated = account.xSubscriptionTierUpdatedAt?.getTime() ?? 0;
  const isStale = now - lastUpdated > STALE_THRESHOLD_MS;

  if (!account.xSubscriptionTier || isStale) {
    try {
      const tier = await XApiService.fetchXSubscriptionTier(accountId);
      return Response.json({
        tier,
        updatedAt: new Date().toISOString(),
        fresh: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      if (message === "X_SESSION_EXPIRED") {
        return ApiError.forbidden("X session expired. Please reconnect your account.");
      }
      if (message === "X_RATE_LIMITED") {
        if (account.xSubscriptionTier) {
          return Response.json({
            tier: account.xSubscriptionTier,
            updatedAt: account.xSubscriptionTierUpdatedAt?.toISOString(),
            fresh: false,
            warning: "Rate limited by X; returning cached tier.",
          });
        }
        return ApiError.serviceUnavailable("Rate limited by X. Please try again later.");
      }

      logger.error("x_subscription_tier_fetch_error", {
        accountId,
        error: message,
      });

      if (account.xSubscriptionTier) {
        return Response.json({
          tier: account.xSubscriptionTier,
          updatedAt: account.xSubscriptionTierUpdatedAt?.toISOString(),
          fresh: false,
          warning: "Failed to fetch fresh tier; returning cached value.",
        });
      }

      return ApiError.internal("Failed to fetch subscription tier.");
    }
  }

  return Response.json({
    tier: account.xSubscriptionTier,
    updatedAt: account.xSubscriptionTierUpdatedAt?.toISOString(),
    fresh: false,
  });
}
