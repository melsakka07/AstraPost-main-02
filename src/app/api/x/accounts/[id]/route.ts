import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { xAccounts } from "@/lib/schema";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  // Verify ownership before deleting
  const account = await db.query.xAccounts.findFirst({
    where: and(eq(xAccounts.id, id), eq(xAccounts.userId, session.user.id)),
    columns: { id: true },
  });

  if (!account) {
    return new Response("Not Found", { status: 404 });
  }

  await db.delete(xAccounts).where(eq(xAccounts.id, id));

  return Response.json({ success: true });
}
