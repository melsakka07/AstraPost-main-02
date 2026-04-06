import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { xAccounts } from "@/lib/schema";

const schema = z.object({
  xAccountId: z.string(),
  isDefault: z.boolean(),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  const { xAccountId, isDefault } = parsed.data;
  const acc = await db.query.xAccounts.findFirst({
    where: and(eq(xAccounts.id, xAccountId), eq(xAccounts.userId, session.user.id)),
  });
  if (!acc) return new Response("Not found", { status: 404 });

  await db.transaction(async (tx) => {
    // Clear ALL defaults for this user
    await tx.update(xAccounts).set({ isDefault: false }).where(eq(xAccounts.userId, session.user.id));
    // Set the new default
    await tx.update(xAccounts).set({ isDefault }).where(eq(xAccounts.id, xAccountId));
  });
  return Response.json({ success: true });
}

