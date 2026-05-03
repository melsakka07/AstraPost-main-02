import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { user } from "@/lib/schema";
import { sendEmail } from "@/lib/services/email";

const extendTrialSchema = z.object({
  days: z.number().int().min(1).max(365),
  reason: z.string().min(1).max(500),
});

function arabicDaysWord(days: number): string {
  if (days === 1) return "يوم واحد";
  if (days === 2) return "يومان";
  if (days >= 3 && days <= 10) return `${days} أيام`;
  return `${days} يوماً`;
}

function englishDaysWord(days: number): string {
  return days === 1 ? "day" : "days";
}

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const correlationId = getCorrelationId(req);

  try {
    const body = await req.json().catch(() => null);
    if (!body) return ApiError.badRequest("Invalid JSON body");

    const parsed = extendTrialSchema.safeParse(body);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { days, reason } = parsed.data;
    const { userId } = await params;

    if (!userId) {
      return ApiError.badRequest("User ID required");
    }

    // Fetch the user
    const [targetUser] = await db
      .select({
        id: user.id,
        email: user.email,
        trialEndsAt: user.trialEndsAt,
        language: user.language,
      })
      .from(user)
      .where(eq(user.id, userId));

    if (!targetUser) {
      return ApiError.notFound("User not found");
    }

    // Calculate new trial end date
    const now = new Date();
    const newTrialEndsAt: Date =
      !targetUser.trialEndsAt || targetUser.trialEndsAt < now
        ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
        : new Date(targetUser.trialEndsAt.getTime() + days * 24 * 60 * 60 * 1000);

    // Update the user
    await db
      .update(user)
      .set({
        trialEndsAt: newTrialEndsAt,
        trialExtendedAt: new Date(),
      })
      .where(eq(user.id, userId));

    // Build email content
    const isArabic = targetUser.language === "ar";
    const endDateStr = newTrialEndsAt.toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Riyadh",
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const daysLabel = isArabic ? arabicDaysWord(days) : englishDaysWord(days);

    const subject = isArabic
      ? `تم تمديد فترتك التجريبية في AstraPost بمقدار ${daysLabel}`
      : `Your AstraPost trial has been extended by ${days} ${daysLabel}`;

    const reasonLine = isArabic ? `سبب التمديد: ${reason}` : `Reason for extension: ${reason}`;
    const loginLine = isArabic
      ? `سجل الدخول الآن للاستمتاع بجميع ميزات Pro: ${appUrl}/login`
      : `Log in now to enjoy all Pro features: ${appUrl}/login`;

    const text = isArabic
      ? `أخبار رائعة! تم تمديد فترتك التجريبية المجانية لـ AstraPost Pro بمقدار ${daysLabel}.\n\nتاريخ انتهاء فترتك التجريبية الجديد: ${endDateStr}\n\n${reason ? `${reasonLine}\n\n` : ""}${loginLine}`
      : `Great news! Your AstraPost Pro free trial has been extended by ${days} ${daysLabel}.\n\nYour new trial end date: ${endDateStr}\n\n${reason ? `${reasonLine}\n\n` : ""}${loginLine}`;

    await sendEmail({
      to: targetUser.email,
      subject,
      text,
      metadata: { type: "trial_extension", userId, days },
    });

    logger.info("admin_extend_trial", {
      adminId: auth.session.user.id,
      targetUserId: userId,
      days,
      reason,
      newTrialEndsAt: newTrialEndsAt.toISOString(),
      correlationId,
    });

    const res = Response.json({
      success: true,
      newTrialEndsAt: newTrialEndsAt.toISOString(),
      userId,
    });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (err) {
    logger.error("admin_extend_trial_error", {
      error: err instanceof Error ? err.message : String(err),
      correlationId,
    });
    return ApiError.internal("Failed to extend trial");
  }
}
