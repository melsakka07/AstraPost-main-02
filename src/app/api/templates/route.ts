import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { templates } from "@/lib/schema";

const aiMetaSchema = z.object({
  templateId: z.string(),
  tone: z.string(),
  language: z.string(),
  outputFormat: z.string(),
}).nullable().optional();

const createTemplateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  content: z.array(z.string()).min(1, "Template must have at least one tweet"),
  category: z.string().default("Personal"),
  aiMeta: aiMetaSchema,
});

export async function GET(_req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userTemplates = await db.query.templates.findMany({
      where: eq(templates.userId, session.user.id),
      orderBy: [desc(templates.createdAt)],
    });

    return Response.json(userTemplates);
  } catch (error) {
    console.error("Fetch Templates Error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch templates" }), { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const json = await req.json();
    const result = createTemplateSchema.safeParse(json);

    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), { status: 400 });
    }

    const { title, description, content, category, aiMeta } = result.data;

    const [newTemplate] = await db.insert(templates).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      title,
      description,
      content,
      category,
      ...(aiMeta !== undefined && { aiMeta }),
    }).returning();

    return Response.json(newTemplate);
  } catch (error) {
    console.error("Create Template Error:", error);
    return new Response(JSON.stringify({ error: "Failed to create template" }), { status: 500 });
  }
}
