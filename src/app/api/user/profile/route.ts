import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

const profileSchema = z.object({
  name: z.string().min(2).max(50),
  timezone: z.string(),
  language: z.string().min(2),
});

export async function PATCH(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, timezone, language } = profileSchema.parse(body);

    await db
      .update(user)
      .set({
        name,
        timezone,
        language,
      })
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 400 });
    }
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
