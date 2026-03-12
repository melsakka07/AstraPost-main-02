import { headers } from "next/headers";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { feedback, feedbackVotes } from "@/lib/schema";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    // Check if already voted
    const existingVote = await db.query.feedbackVotes.findFirst({
        where: and(
            eq(feedbackVotes.feedbackId, id),
            eq(feedbackVotes.userId, session.user.id)
        )
    });

    if (existingVote) {
        // Remove vote
        await db.delete(feedbackVotes).where(eq(feedbackVotes.id, existingVote.id));
        await db.update(feedback)
            .set({ upvotes: sql`upvotes - 1` })
            .where(eq(feedback.id, id));
        return Response.json({ voted: false });
    } else {
        // Add vote
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
    return new Response("Internal Server Error", { status: 500 });
  }
}
