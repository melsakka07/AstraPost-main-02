import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { notifications } from "@/lib/schema";

const API_TIMEOUT_MS = 7000;

type TimeoutResult<T> = { status: "ok"; value: T } | { status: "timed_out" } | { status: "error" };

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<TimeoutResult<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<TimeoutResult<T>>((resolve) => {
    timeoutId = setTimeout(() => resolve({ status: "timed_out" }), timeoutMs);
  });
  const resultPromise = promise
    .then((value) => ({ status: "ok", value }) as TimeoutResult<T>)
    .catch(() => ({ status: "error" }) as TimeoutResult<T>);
  const result = await Promise.race([resultPromise, timeoutPromise]);
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  return result;
}

export async function GET() {
  const sessionResult = await withTimeout(
    auth.api.getSession({ headers: await headers() }),
    API_TIMEOUT_MS
  );
  if (sessionResult.status === "timed_out" || sessionResult.status === "error") {
    logger.warn("notifications_get_session_timeout");
    return Response.json([]);
  }
  const session = sessionResult.value;
  if (!session) {
    return ApiError.unauthorized();
  }

  const notificationsResult = await withTimeout(
    db.query.notifications.findMany({
      where: eq(notifications.userId, session.user.id),
      orderBy: [desc(notifications.createdAt)],
      limit: 50,
    }),
    API_TIMEOUT_MS
  );
  if (notificationsResult.status !== "ok") {
    logger.warn("notifications_get_query_timeout", { userId: session.user.id });
    return Response.json([]);
  }

  return Response.json(notificationsResult.value);
}

export async function PATCH(req: Request) {
  const sessionResult = await withTimeout(
    auth.api.getSession({ headers: await headers() }),
    API_TIMEOUT_MS
  );
  if (sessionResult.status !== "ok") {
    return ApiError.serviceUnavailable("Notifications are temporarily unavailable");
  }
  const session = sessionResult.value;
  if (!session) {
    return ApiError.unauthorized();
  }

  const body = await req.json().catch(() => ({}));
  const { id, all } = body;
  const isMarkAll = all === true;
  const notificationId = typeof id === "string" && id.length > 0 ? id : null;

  if (isMarkAll) {
    const updateResult = await withTimeout(
      db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false))),
      API_TIMEOUT_MS
    );
    if (updateResult.status !== "ok") {
      logger.warn("notifications_patch_all_timeout", { userId: session.user.id });
      return ApiError.serviceUnavailable("Notifications are temporarily unavailable");
    }
  } else if (notificationId) {
    const updateResult = await withTimeout(
      db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(eq(notifications.id, notificationId), eq(notifications.userId, session.user.id))
        ),
      API_TIMEOUT_MS
    );
    if (updateResult.status !== "ok") {
      logger.warn("notifications_patch_one_timeout", { userId: session.user.id, notificationId });
      return ApiError.serviceUnavailable("Notifications are temporarily unavailable");
    }
  } else {
    return ApiError.badRequest("Missing id or all flag");
  }

  return Response.json({ success: true });
}
