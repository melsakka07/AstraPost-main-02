import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { templates, user } from "@/lib/schema";

const aiMetaSchema = z
  .object({
    templateId: z.string(),
    tone: z.string(),
    language: z.string(),
    outputFormat: z.string(),
  })
  .nullable()
  .optional();

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
      return ApiError.unauthorized();
    }

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { plan: true },
    });

    const rateLimit = await checkRateLimit(session.user.id, dbUser?.plan || "free", "auth");
    if (!rateLimit.success) return createRateLimitResponse(rateLimit);

    const userTemplates = await db.query.templates.findMany({
      where: eq(templates.userId, session.user.id),
      orderBy: [desc(templates.createdAt)],
    });

    return Response.json(userTemplates);
  } catch (error) {
    logger.error("Fetch Templates Error", { error });
    return ApiError.internal("Failed to fetch templates");
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return ApiError.unauthorized();
    }

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { plan: true },
    });

    const rateLimit = await checkRateLimit(session.user.id, dbUser?.plan || "free", "posts");
    if (!rateLimit.success) return createRateLimitResponse(rateLimit);

    const json = await req.json();
    const result = createTemplateSchema.safeParse(json);

    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { title, description, content, category, aiMeta } = result.data;

    const [newTemplate] = await db
      .insert(templates)
      .values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        title,
        description,
        content,
        category,
        ...(aiMeta !== undefined && { aiMeta }),
      })
      .returning();

    return Response.json(newTemplate);
  } catch (error) {
    logger.error("Create Template Error", { error });
    return ApiError.internal("Failed to create template");
  }
}
