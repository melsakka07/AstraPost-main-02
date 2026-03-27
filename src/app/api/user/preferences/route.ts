import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

function isValidIANATimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const preferencesSchema = z.object({
  timezone: z
    .string()
    .min(1)
    .refine(isValidIANATimezone, { message: "Invalid IANA timezone" }),
  language: z.string().min(2).max(10),
});

// One year — locale preference is stable
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { timezone, language } = preferencesSchema.parse(body);

    await db
      .update(user)
      .set({ timezone, language })
      .where(eq(user.id, session.user.id));

    // Persist locale cookie so layout lang/dir attributes update immediately
    const cookieStore = await cookies();
    cookieStore.set("locale", language, {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 400 });
    }
    console.error("Failed to save preferences:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
