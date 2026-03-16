/**
 * AI Image Quota API
 * GET /api/ai/image/quota
 *
 * Returns the authenticated user's plan-based image generation limits and
 * current monthly usage — used by the Composer to show accurate quota state.
 */

import { headers } from "next/headers";
import { and, eq, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlanLimits, normalizePlan } from "@/lib/plan-limits";
import { aiGenerations, user } from "@/lib/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const userId = session.user.id;

  const userRecord = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { plan: true },
  });

  const plan = normalizePlan(userRecord?.plan);
  const limits = getPlanLimits(plan);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const usageRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.userId, userId),
        eq(aiGenerations.type, "image"),
        gte(aiGenerations.createdAt, monthStart),
      ),
    );

  const used = usageRows[0]?.count ?? 0;
  const limit = limits.aiImagesPerMonth; // -1 means unlimited
  const remaining = limit === -1 ? -1 : Math.max(0, limit - used);

  return Response.json({
    availableModels: limits.availableImageModels,
    preferredModel: limits.availableImageModels[0] ?? "nano-banana-2",
    remainingImages: remaining,
    limit,
    used,
  });
}
