import { headers } from "next/headers";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { feedback, feedbackVotes } from "@/lib/schema";

const feedbackSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or fewer"),
  description: z.string().min(1, "Description is required").max(2000, "Description must be 2000 characters or fewer"),
  category: z.enum(["feature", "bug", "other"]).optional().default("feature"),
});

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const items = await db.query.feedback.findMany({
      orderBy: [desc(feedback.upvotes), desc(feedback.createdAt)],
      with: {
        user: {
          columns: {
            name: true,
            image: true,
          },
        },
        votes: {
          where: (votes, { eq: eqFn }) => eqFn(votes.userId, session.user.id),
          columns: {
            userId: true,
          },
        },
      },
      limit: 50,
    });

    const formatted = items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      status: item.status,
      upvotes: item.upvotes,
      createdAt: item.createdAt,
      user: item.user,
      hasUpvoted: item.votes.length > 0,
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

    const body = await req.json().catch(() => null);
    const result = feedbackSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Invalid input", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, description, category } = result.data;

    const newFeedback = await db
      .insert(feedback)
      .values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        title,
        description,
        category,
        status: "pending",
        upvotes: 1, // auto-upvote by creator
      })
      .returning();

    const createdFeedback = newFeedback[0];

    if (!createdFeedback) {
      throw new Error("Failed to create feedback");
    }

    // Record creator's auto-upvote vote row
    await db.insert(feedbackVotes).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      feedbackId: createdFeedback.id,
    });

    return Response.json(createdFeedback);
  } catch (error) {
    console.error("Create Feedback Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
