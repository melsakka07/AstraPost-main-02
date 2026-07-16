import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserPlanType } from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { aiGenerations } from "@/lib/schema";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const rateLimit = await checkRateLimit(
    session.user.id,
    await getUserPlanType(session.user.id),
    "ai"
  );
  if (!rateLimit.success) return createRateLimitResponse(rateLimit);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const item = await db.query.aiGenerations.findFirst({
      where: eq(aiGenerations.id, id),
    });
    if (item && item.userId !== session.user.id) return ApiError.forbidden();
    return Response.json({ item });
  }

  const history = await db.query.aiGenerations.findMany({
    where: eq(aiGenerations.userId, session.user.id),
    orderBy: [desc(aiGenerations.createdAt)],
    limit: 50,
  });

  return Response.json({ history });
}

export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const parsed = z.object({ id: z.string().min(1) }).safeParse(await req.json());
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  const { id } = parsed.data;

  const item = await db.query.aiGenerations.findFirst({
    where: eq(aiGenerations.id, id),
  });
  if (!item) return ApiError.notFound();
  if (item.userId !== session.user.id) return ApiError.forbidden();

  await db.delete(aiGenerations).where(eq(aiGenerations.id, id));

  return Response.json({ success: true });
}
