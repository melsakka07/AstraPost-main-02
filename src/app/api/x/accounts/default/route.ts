import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { xAccounts } from "@/lib/schema";

const schema = z.object({
  xAccountId: z.string(),
  isDefault: z.boolean(),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return ApiError.badRequest(parsed.error.issues);
  }

  const { xAccountId, isDefault } = parsed.data;
  const acc = await db.query.xAccounts.findFirst({
    where: and(eq(xAccounts.id, xAccountId), eq(xAccounts.userId, session.user.id)),
  });
  if (!acc) return ApiError.notFound("X account");

  await db.transaction(async (tx) => {
    // Clear ALL defaults for this user
    await tx
      .update(xAccounts)
      .set({ isDefault: false })
      .where(eq(xAccounts.userId, session.user.id));
    // Set the new default
    await tx.update(xAccounts).set({ isDefault }).where(eq(xAccounts.id, xAccountId));
  });
  return Response.json({ success: true });
}
