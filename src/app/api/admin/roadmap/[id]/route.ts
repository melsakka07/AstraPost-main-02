import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { feedback } from "@/lib/schema";

const updateSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  adminNotes: z.string().max(1000).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const result = updateSchema.safeParse(body);

  if (!result.success) {
    return ApiError.badRequest(result.error.issues);
  }

  const { status, adminNotes } = result.data;

  const existing = await db.query.feedback.findFirst({
    where: eq(feedback.id, id),
  });

  if (!existing) {
    return ApiError.notFound("Feedback");
  }

  const updated = await db
    .update(feedback)
    .set({
      status,
      adminNotes: adminNotes ?? null,
      reviewedAt: new Date(),
    })
    .where(eq(feedback.id, id))
    .returning();

  return Response.json(updated[0]);
}
