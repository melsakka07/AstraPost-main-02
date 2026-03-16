import { headers, cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

/**
 * Validates a timezone string against the IANA time zone database using the
 * runtime's built-in `Intl.DateTimeFormat`. This is preferred over a static
 * regex or a bundled IANA list because it delegates to the V8 ICU data that
 * is already loaded — zero extra bundle size and always up-to-date.
 *
 * `Intl.DateTimeFormat` throws `RangeError: Invalid time zone specified` for
 * any string that does not exist in the IANA database.
 */
function isValidIANATimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const profileSchema = z.object({
  name: z.string().min(2).max(50),
  timezone: z
    .string()
    .refine(isValidIANATimezone, { message: "Invalid timezone" }),
  language: z.string().min(2).max(10),
});

// One year in seconds — locale preference is stable, long TTL is appropriate
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

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
      .set({ name, timezone, language })
      .where(eq(user.id, session.user.id));

    // Persist the locale cookie so the root layout's lang/dir attributes
    // (Finding 2.15 / E19) immediately reflect the user's language choice
    // without requiring a full sign-out / sign-in cycle.
    //
    // httpOnly: false — the root layout reads this server-side via cookies(),
    // but client-side code may also need it for RTL direction toggling.
    // sameSite: lax — secure for cross-origin navigations; allows top-level
    // GET navigations to carry the cookie.
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
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
