import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userNotifications = await db.query.notifications.findMany({
    where: eq(notifications.userId, session.user.id),
    orderBy: [desc(notifications.createdAt)],
    limit: 50,
  });

  return NextResponse.json(userNotifications);
}

export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, all } = body;

  if (all) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false)));
  } else if (id) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)));
  } else {
    return NextResponse.json({ error: "Missing id or all flag" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
