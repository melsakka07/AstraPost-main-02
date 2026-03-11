import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { templates } from "@/lib/schema";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const [deletedTemplate] = await db
      .delete(templates)
      .where(and(eq(templates.id, id), eq(templates.userId, session.user.id)))
      .returning();

    if (!deletedTemplate) {
        return new Response("Template not found", { status: 404 });
    }

    return Response.json(deletedTemplate);
  } catch (error) {
    console.error("Delete Template Error:", error);
    return new Response(JSON.stringify({ error: "Failed to delete template" }), { status: 500 });
  }
}
