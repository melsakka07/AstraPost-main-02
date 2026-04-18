import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { linkedinAccounts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

const DisconnectSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
});

export async function POST(req: Request) {
  const ctx = await getTeamContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const parsed = DisconnectSchema.safeParse(await req.json());
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  const { accountId } = parsed.data;

  // Verify the account exists and belongs to the current user
  const account = await db.query.linkedinAccounts.findFirst({
    where: and(eq(linkedinAccounts.id, accountId), eq(linkedinAccounts.userId, ctx.currentTeamId)),
  });

  if (!account) {
    return ApiError.notFound("LinkedIn account not found");
  }

  // Delete the account
  await db.delete(linkedinAccounts).where(eq(linkedinAccounts.id, accountId));

  return Response.json({ success: true });
}
