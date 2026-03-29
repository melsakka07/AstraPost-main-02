import { headers } from "next/headers";
import { eq, and, sql } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { feedback, feedbackVotes } from "@/lib/schema";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return ApiError.unauthorized();
    }

    const { id } = await params;

    const feedbackItem = await db.query.feedback.findFirst({
      where: eq(feedback.id, id),
    });

    if (!feedbackItem) {
      return ApiError.notFound("Feedback");
    }

    if (feedbackItem.status !== "approved") {
      return ApiError.badRequest("Cannot vote on unapproved feedback");
    }

    const existingVote = await db.query.feedbackVotes.findFirst({
      where: and(
        eq(feedbackVotes.feedbackId, id),
        eq(feedbackVotes.userId, session.user.id)
      )
    });

    if (existingVote) {
      await db.delete(feedbackVotes).where(eq(feedbackVotes.id, existingVote.id));
      await db.update(feedback)
        .set({ upvotes: sql`upvotes - 1` })
        .where(eq(feedback.id, id));
      return Response.json({ voted: false });
    } else {
      await db.insert(feedbackVotes).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        feedbackId: id
      });
      await db.update(feedback)
        .set({ upvotes: sql`upvotes + 1` })
        .where(eq(feedback.id, id));
      return Response.json({ voted: true });
    }

  } catch (error) {
    console.error("Upvote Error:", error);
    return ApiError.internal();
  }
}