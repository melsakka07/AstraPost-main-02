import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { analyticsQueue } from "@/lib/queue/client";
import { analyticsRefreshRuns, xAccounts } from "@/lib/schema";

const schema = z.object({
  xAccountIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const correlationId = getCorrelationId(req);
  logger.info("api_request", {
    route: "/api/analytics/refresh",
    method: "POST",
    correlationId,
    userId: session.user.id,
  });

  const json = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return ApiError.badRequest("Invalid request");
  }

  const all = await db.query.xAccounts.findMany({
    where: and(eq(xAccounts.userId, session.user.id), eq(xAccounts.isActive, true)),
  });
  if (all.length === 0) {
    return ApiError.badRequest("No connected X accounts");
  }

  const targetIds =
    parsed.data.xAccountIds && parsed.data.xAccountIds.length > 0
      ? parsed.data.xAccountIds
      : all.map((a) => a.id);

  const selected = all.filter((a) => targetIds.includes(a.id));
  if (selected.length === 0) {
    return ApiError.badRequest("Invalid target accounts");
  }

  const runIds: string[] = [];
  const now = new Date();
  for (const acc of selected) {
    const id = crypto.randomUUID();
    runIds.push(id);
    await db.insert(analyticsRefreshRuns).values({
      id,
      userId: session.user.id,
      xAccountId: acc.id,
      status: "running",
      startedAt: now,
    });
  }

  await analyticsQueue.add(
    "manual-refresh",
    { runIds, correlationId },
    {
      jobId: `manual-refresh-${crypto.randomUUID()}`,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 1,
    }
  );

  const res = Response.json({ success: true, runIds });
  res.headers.set("x-correlation-id", correlationId);
  return res;
}
