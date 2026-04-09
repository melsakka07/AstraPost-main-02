import { eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { feedback, feedbackVotes } from "@/lib/schema";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const existing = await db.query.feedback.findFirst({
    where: eq(feedback.id, id),
  });

  if (!existing) {
    return ApiError.notFound("Feedback");
  }

  await db.delete(feedbackVotes).where(eq(feedbackVotes.feedbackId, id));

  await db.delete(feedback).where(eq(feedback.id, id));

  return Response.json({ success: true });
}
