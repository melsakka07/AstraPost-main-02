import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
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
  timezone: z.string().min(1).refine(isValidIANATimezone, { message: "Invalid IANA timezone" }),
  language: z.string().min(2).max(10),
});

// One year — locale preference is stable
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function PATCH(req: Request) {
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

  try {
    const body = await req.json();
    const parsed = preferencesSchema.safeParse(body);

    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const { timezone, language } = parsed.data;

    await db.update(user).set({ timezone, language }).where(eq(user.id, session.user.id));

    // Persist locale cookie so layout lang/dir attributes update immediately
    const cookieStore = await cookies();
    cookieStore.set("locale", language, {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error("Failed to save preferences", { error });
    return ApiError.internal("Internal Error");
  }
}
