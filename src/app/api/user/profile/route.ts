import { headers, cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
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
  timezone: z.string().refine(isValidIANATimezone, { message: "Invalid timezone" }),
  language: z.string().min(2).max(10),
  image: z.string().url().optional().or(z.literal("")),
});

// One year in seconds — locale preference is stable, long TTL is appropriate
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function PATCH(req: Request) {
  const correlationId = getCorrelationId(req);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return ApiError.unauthorized();
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { plan: true },
  });

  const rateLimit = await checkRateLimit(session.user.id, dbUser?.plan || "free", "auth");
  if (!rateLimit.success) return createRateLimitResponse(rateLimit);

  try {
    const body = await req.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const { name, timezone, language, image } = parsed.data;

    await db
      .update(user)
      .set({
        name,
        timezone,
        language,
        ...(image !== undefined && { image: image || null }),
      })
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

    const res = Response.json({ success: true });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("Profile update error", { error, correlationId });
    return ApiError.internal("Internal Error");
  }
}
