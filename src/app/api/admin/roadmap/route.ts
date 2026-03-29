import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { feedback } from "@/lib/schema";

const listQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().max(200).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  const { status, page, limit, search } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (status !== "all") {
    conditions.push(eq(feedback.status, status));
  }

  if (search) {
    conditions.push(
      or(
        ilike(feedback.title, `%${search}%`),
        ilike(feedback.description, `%${search}%`)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ total: count() })
    .from(feedback)
    .where(where);
  const total = countResult[0]?.total ?? 0;

  const items = await db.query.feedback.findMany({
    where,
    orderBy: [desc(feedback.createdAt)],
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
    },
    limit,
    offset,
  });

  const pendingCount = await db
    .select({ count: count() })
    .from(feedback)
    .where(eq(feedback.status, "pending"));
  const approvedCount = await db
    .select({ count: count() })
    .from(feedback)
    .where(eq(feedback.status, "approved"));
  const rejectedCount = await db
    .select({ count: count() })
    .from(feedback)
    .where(eq(feedback.status, "rejected"));

  return Response.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    counts: {
      pending: pendingCount[0]?.count ?? 0,
      approved: approvedCount[0]?.count ?? 0,
      rejected: rejectedCount[0]?.count ?? 0,
    },
  });
}