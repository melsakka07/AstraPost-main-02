import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getUserPlanType } from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { onboardingStateSchema } from "@/lib/schemas/common";

function isValidIANATimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const notificationSettingsSchema = z.object({
  postFailures: z.boolean().optional(),
  aiQuotaWarning: z.boolean().optional(),
  trialExpiry: z.boolean().optional(),
  teamInvites: z.boolean().optional(),
});

const preferencesSchema = z
  .object({
    timezone: z
      .string()
      .min(1)
      .refine(isValidIANATimezone, { message: "Invalid IANA timezone" })
      .optional(),
    language: z.string().min(2).max(10).optional(),
    notificationSettings: notificationSettingsSchema.optional(),
    onboardingState: onboardingStateSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// One year — locale preference is stable
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function PATCH(req: Request) {
  const correlationId = getCorrelationId(req);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return ApiError.unauthorized();
  }

  const rateLimit = await checkRateLimit(
    session.user.id,
    await getUserPlanType(session.user.id),
    "auth"
  );
  if (!rateLimit.success) return createRateLimitResponse(rateLimit);

  try {
    const body = await req.json();
    const parsed = preferencesSchema.safeParse(body);

    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const { timezone, language, notificationSettings, onboardingState } = parsed.data;

    // If onboardingState is being patched, read the current state first so we can
    // deep-merge the partial update rather than overwriting unset fields.
    let mergedOnboardingState: Record<string, unknown> | undefined;
    if (onboardingState !== undefined) {
      const [currentUser] = await db
        .select({ onboardingState: user.onboardingState })
        .from(user)
        .where(eq(user.id, session.user.id));

      const defaults = {
        tourSeen: false,
        checklistDismissedAt: null,
        checklistCollapsed: false,
        version: 1,
      };
      mergedOnboardingState = {
        ...defaults,
        ...((currentUser?.onboardingState as Record<string, unknown> | null) ?? {}),
        ...onboardingState,
      };
    }

    const updateData: Record<string, unknown> = {};
    if (timezone !== undefined) updateData.timezone = timezone;
    if (language !== undefined) updateData.language = language;
    if (notificationSettings !== undefined) updateData.notificationSettings = notificationSettings;
    if (mergedOnboardingState !== undefined) updateData.onboardingState = mergedOnboardingState;

    await db.update(user).set(updateData).where(eq(user.id, session.user.id));

    // Persist locale cookie so layout lang/dir attributes update immediately
    if (language) {
      const cookieStore = await cookies();
      cookieStore.set("locale", language, {
        maxAge: LOCALE_COOKIE_MAX_AGE,
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    const res = Response.json({ success: true });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("Failed to save preferences", { error, correlationId });
    return ApiError.internal("Internal Error");
  }
}
