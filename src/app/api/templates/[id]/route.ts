import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { templates } from "@/lib/schema";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return ApiError.unauthorized();
    }

    const { id } = await params;

    const [deletedTemplate] = await db
      .delete(templates)
      .where(and(eq(templates.id, id), eq(templates.userId, session.user.id)))
      .returning();

    if (!deletedTemplate) {
      return ApiError.notFound("Template");
    }

    return Response.json(deletedTemplate);
  } catch (error) {
    logger.error("Delete Template Error", { error });
    return ApiError.internal("Failed to delete template");
  }
}
