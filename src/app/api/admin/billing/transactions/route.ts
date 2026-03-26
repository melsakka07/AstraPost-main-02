import { desc, eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { db } from "@/lib/db";
import { subscriptions, user } from "@/lib/schema";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  // Last 20 subscription records, newest first, with subscriber name/email
  const rows = await db
    .select({
      id: subscriptions.id,
      plan: subscriptions.plan,
      status: subscriptions.status,
      stripePriceId: subscriptions.stripePriceId,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      cancelledAt: subscriptions.cancelledAt,
      createdAt: subscriptions.createdAt,
      updatedAt: subscriptions.updatedAt,
      userId: subscriptions.userId,
      userName: user.name,
      userEmail: user.email,
    })
    .from(subscriptions)
    .leftJoin(user, eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.updatedAt))
    .limit(20);

  return Response.json({ data: rows });
}
