/**
 * AI Image Quota API
 * GET /api/ai/image/quota
 *
 * Returns the authenticated user's plan-based image generation limits and
 * current monthly usage — used by the Composer to show accurate quota state.
 */

import { headers } from "next/headers";
import { and, eq, gte, sql } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { normalizePlan } from "@/lib/plan-limits";
import { aiGenerations, user } from "@/lib/schema";
import { getPlanMetadata } from "@/lib/services/plan-metadata";
import { getMonthWindow } from "@/lib/utils/time";

export async function GET(req: Request) {
  const correlationId = getCorrelationId(req);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const userId = session.user.id;

  const userRecord = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { plan: true },
  });

  // Display-only read: getPlanMetadata is used here solely to return UI metadata
  // (available models, quota counts). No gating decision is made.
  // Intentional exception to CLAUDE.md §16 — no enforcement side effects.
  const plan = normalizePlan(userRecord?.plan);
  const limits = getPlanMetadata(plan);

  const { start: monthStart } = getMonthWindow();

  const usageRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.userId, userId),
        eq(aiGenerations.type, "image"),
        gte(aiGenerations.createdAt, monthStart)
      )
    );

  const used = usageRows[0]?.count ?? 0;
  const limit = limits.aiImagesPerMonth; // -1 means unlimited
  const remaining = limit === -1 ? -1 : Math.max(0, limit - used);

  const res = Response.json({
    availableModels: limits.availableImageModels,
    preferredModel: limits.availableImageModels[0] ?? process.env.REPLICATE_MODEL_FALLBACK!,
    remainingImages: remaining,
    limit,
    used,
  });
  res.headers.set("x-correlation-id", correlationId);
  return res;
}
