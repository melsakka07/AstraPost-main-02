import { headers } from "next/headers";
import { and, eq, asc, count, ne } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { xAccounts, posts } from "@/lib/schema";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const { id } = await params;

  try {
    // Use transaction for atomic operations
    await db.transaction(async (tx) => {
      // 1. Verify ownership and get account details
      const account = await tx.query.xAccounts.findFirst({
        where: and(eq(xAccounts.id, id), eq(xAccounts.userId, session.user.id)),
        columns: {
          id: true,
          isDefault: true,
        },
      });

      if (!account) {
        throw new Error("NOT_FOUND");
      }

      // 2. Count user's total X accounts
      const result = await tx
        .select({ totalCount: count() })
        .from(xAccounts)
        .where(eq(xAccounts.userId, session.user.id));

      const totalCount = result[0]?.totalCount ?? 0;

      // 3. Prevent removing the last account
      if (totalCount === 1) {
        throw new Error("LAST_ACCOUNT");
      }

      // 4. If removing the default account, promote another to default
      if (account.isDefault) {
        // Find the first active account to promote (excluding current account)
        const newDefault = await tx.query.xAccounts.findFirst({
          where: and(
            eq(xAccounts.userId, session.user.id),
            eq(xAccounts.isActive, true),
            ne(xAccounts.id, id)
          ),
          columns: { id: true },
          orderBy: [asc(xAccounts.createdAt)],
        });

        if (newDefault) {
          await tx
            .update(xAccounts)
            .set({ isDefault: true })
            .where(eq(xAccounts.id, newDefault.id));
        } else {
          // No active accounts, pick the oldest one (excluding current account)
          const oldestAccount = await tx.query.xAccounts.findFirst({
            where: and(
              eq(xAccounts.userId, session.user.id),
              ne(xAccounts.id, id)
            ),
            columns: { id: true },
            orderBy: [asc(xAccounts.createdAt)],
          });

          if (oldestAccount) {
            await tx
              .update(xAccounts)
              .set({ isDefault: true })
              .where(eq(xAccounts.id, oldestAccount.id));
          }
        }
      }

      // 5. Cancel posts that are scheduled or paused for this account
      await tx
        .update(posts)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(posts.xAccountId, id),
            eq(posts.userId, session.user.id),
            eq(posts.status, "scheduled")
          )
        );

      await tx
        .update(posts)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(posts.xAccountId, id),
            eq(posts.userId, session.user.id),
            eq(posts.status, "paused_needs_reconnect")
          )
        );

      // 6. Delete the account
      await tx.delete(xAccounts).where(eq(xAccounts.id, id));
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return ApiError.notFound("X account");
      }
      if (error.message === "LAST_ACCOUNT") {
        return ApiError.badRequest("Cannot remove your last connected X account");
      }
    }
    // Re-throw database errors
    throw error;
  }
}
