import { headers } from "next/headers";
import { desc, eq, count, and, gte } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
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
      return ApiError.unauthorized();
    }

    const items = await db.query.feedback.findMany({
      where: eq(feedback.status, "approved"),
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
    return ApiError.internal();
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return ApiError.unauthorized();
    }

    const body = await req.json().catch(() => null);
    const result = feedbackSchema.safeParse(body);

    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { title, description, category } = result.data;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userSubmissionsToday = await db
      .select({ count: count() })
      .from(feedback)
      .where(
        and(
          eq(feedback.userId, session.user.id),
          gte(feedback.createdAt, oneDayAgo)
        )
      );

    if ((userSubmissionsToday[0]?.count ?? 0) >= 3) {
      return ApiError.badRequest("You can only submit a maximum of 3 feedback items per day. Please try again tomorrow.");
    }

    const newFeedback = await db
      .insert(feedback)
      .values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        title,
        description,
        category,
        status: "pending",
        upvotes: 1,
      })
      .returning();

    const createdFeedback = newFeedback[0];

    if (!createdFeedback) {
      throw new Error("Failed to create feedback");
    }

    await db.insert(feedbackVotes).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      feedbackId: createdFeedback.id,
    });

    return Response.json(createdFeedback);
  } catch (error) {
    console.error("Create Feedback Error:", error);
    return ApiError.internal();
  }
}