import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { aiGenerations } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

const feedbackSchema = z.object({
  generationId: z.string().min(1, "generationId is required"),
  value: z.enum(["positive", "negative"]),
});

export async function POST(req: Request) {
  // Step 1: Auth
  const ctx = await getTeamContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  // Step 2: Role check — viewers cannot submit feedback
  if (ctx.role === "viewer") {
    return ApiError.forbidden("Viewers cannot submit feedback");
  }

  // Step 5: Rate limit feedback submissions to prevent abuse
  const correlationId = getCorrelationId(req);
  const rl = await checkRateLimit(ctx.currentTeamId, "free", "contact");
  if (!rl.success) return createRateLimitResponse(rl);

  // Step 4: Parse + validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiError.badRequest("Invalid JSON body");
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return ApiError.badRequest(parsed.error.issues);
  }

  const { generationId, value } = parsed.data;

  // Step 6: Verify ownership — the generation must belong to the current team
  const generation = await db.query.aiGenerations.findFirst({
    where: eq(aiGenerations.id, generationId),
    columns: { id: true, userId: true },
  });

  if (!generation) {
    return ApiError.notFound("Generation");
  }

  if (generation.userId !== ctx.currentTeamId) {
    return ApiError.forbidden("This generation does not belong to your team");
  }

  // Step 7: Update the feedback column
  await db.update(aiGenerations).set({ feedback: value }).where(eq(aiGenerations.id, generationId));

  logger.info("ai.feedback_recorded", {
    generationId,
    value,
    userId: ctx.currentTeamId,
    correlationId,
  });

  // Step 9: Return
  const res = Response.json({ ok: true });
  res.headers.set("x-correlation-id", correlationId);
  return res;
}
