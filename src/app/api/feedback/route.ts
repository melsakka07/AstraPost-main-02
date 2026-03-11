import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { feedback, feedbackVotes } from "@/lib/schema";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const items = await db.query.feedback.findMany({
      orderBy: [desc(feedback.upvotes), desc(feedback.createdAt)],
      with: {
        user: {
            columns: {
                name: true,
                image: true,
            }
        },
        votes: {
            where: (votes, { eq }) => session ? eq(votes.userId, session.user.id) : undefined,
            columns: {
                userId: true
            }
        }
      },
      limit: 50,
    });

    // Transform to include "hasUpvoted" flag
    const formatted = items.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        status: item.status,
        upvotes: item.upvotes,
        createdAt: item.createdAt,
        user: item.user,
        hasUpvoted: item.votes.length > 0
    }));

    return Response.json({ items: formatted });
  } catch (error) {
    console.error("Get Feedback Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
  
      if (!session) {
        return new Response("Unauthorized", { status: 401 });
      }
  
      const { title, description, category } = await req.json();
  
      if (!title || !description) {
        return new Response("Title and description are required", { status: 400 });
      }
  
      const newFeedback = await db.insert(feedback).values({
          id: crypto.randomUUID(),
          userId: session.user.id,
          title,
          description,
          category: category || "feature",
          status: "pending",
          upvotes: 1 // Auto-upvote by creator? Optional. Let's start with 0 or 1.
      }).returning();

      const createdFeedback = newFeedback[0];

      if (!createdFeedback) {
        throw new Error("Failed to create feedback");
      }

      // Auto-upvote logic
      await db.insert(feedbackVotes).values({
          id: crypto.randomUUID(),
          userId: session.user.id,
          feedbackId: createdFeedback.id
      });

      // Update count
      await db.update(feedback)
        .set({ upvotes: 1 })
        .where(eq(feedback.id, createdFeedback.id));

      return Response.json(createdFeedback);
    } catch (error) {
      console.error("Create Feedback Error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
}
