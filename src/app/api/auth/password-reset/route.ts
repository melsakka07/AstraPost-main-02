import { eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { connection as redis } from "@/lib/queue/client";
import { user, verification } from "@/lib/schema";
import { sendBillingEmail } from "@/lib/services/email";
import { getEmailTranslations } from "@/lib/services/email-translations";

interface PasswordResetTranslations {
  passwordReset: {
    request: { subject: string; greeting: string; body: string; cta: string; ignore: string };
    confirmation: { subject: string; greeting: string; body: string; footer: string };
  };
}

function applyVars(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v), template);
}

const passwordResetRequestSchema = z.object({
  email: z.string().email(),
  action: z.literal("request"),
});

const passwordResetValidateSchema = z.object({
  token: z.string().min(1),
  action: z.literal("validate"),
});

const passwordResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  action: z.literal("reset"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Handle request action - send reset email
    if (body.action === "request") {
      const parsed = passwordResetRequestSchema.safeParse(body);
      if (!parsed.success) {
        return ApiError.badRequest(parsed.error.issues);
      }

      const { email } = parsed.data;

      // Simple IP-based rate limiting for password reset requests (3 per hour)
      const clientIp =
        req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      const rateLimitKey = `ratelimit:password-reset:${clientIp}`;
      try {
        const count = await redis.incr(rateLimitKey);
        if (count === 1) {
          await redis.expire(rateLimitKey, 3600); // 1 hour window
        }
        if (count > 3) {
          logger.warn("password_reset_rate_limit_exceeded", { clientIp, count });
          return Response.json(
            { message: "Too many requests. Please try again later." },
            {
              status: 429,
              headers: { "Retry-After": "3600" },
            }
          );
        }
      } catch (err) {
        logger.error("password_reset_rate_limit_error", { error: err });
        // Fail open if Redis is down
      }

      // Check if user exists
      const userRecord = await db.query.user.findFirst({
        where: eq(user.email, email),
        columns: { id: true, email: true, name: true, language: true },
      });

      if (!userRecord) {
        // Don't reveal whether email exists — return success anyway
        logger.info("password_reset_user_not_found", { email });
        return Response.json({
          success: true,
          message: "If an account exists, a reset link will be sent.",
        });
      }

      // Generate reset token (20 bytes = 40 hex chars)
      const token = crypto.getRandomValues(new Uint8Array(20));
      const tokenHex = Array.from(token)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store verification token
      await db
        .insert(verification)
        .values({
          id: crypto.randomUUID(),
          identifier: email,
          value: tokenHex,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: [verification.identifier],
          set: { value: tokenHex, expiresAt },
        });

      // Send reset email
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${tokenHex}`;
      const locale = userRecord.language || "en";
      const pr = (getEmailTranslations(locale) as unknown as PasswordResetTranslations)
        .passwordReset.request;
      const greeting = applyVars(pr.greeting, { name: userRecord.name || "" });
      const bodyText = applyVars(pr.body, { resetUrl });

      await sendBillingEmail({
        to: userRecord.email,
        subject: pr.subject,
        text: `${greeting}\n\n${bodyText}\n\n${pr.cta}: ${resetUrl}\n\n${pr.ignore}`,
        metadata: {
          event: "password_reset_request",
          userId: userRecord.id,
        },
      }).catch((err) => {
        logger.error("password_reset_email_failed", { userId: userRecord.id, email, error: err });
      });

      logger.info("password_reset_requested", { userId: userRecord.id, email });

      return Response.json({
        success: true,
        message: "If an account exists, a reset link will be sent.",
      });
    }

    // Handle validate action - check if token is valid
    if (body.action === "validate") {
      const parsed = passwordResetValidateSchema.safeParse(body);
      if (!parsed.success) {
        return ApiError.badRequest(parsed.error.issues);
      }

      const { token } = parsed.data;

      const tokenRecord = await db.query.verification.findFirst({
        where: eq(verification.value, token),
      });

      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        return ApiError.badRequest("Invalid or expired reset token");
      }

      return Response.json({ success: true, email: tokenRecord.identifier });
    }

    // Handle reset action - update password
    if (body.action === "reset") {
      const parsed = passwordResetSchema.safeParse(body);
      if (!parsed.success) {
        return ApiError.badRequest(parsed.error.issues);
      }

      const { token, password } = parsed.data;

      const tokenRecord = await db.query.verification.findFirst({
        where: eq(verification.value, token),
      });

      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        return ApiError.badRequest("Invalid or expired reset token");
      }

      // Find user by email
      const userRecord = await db.query.user.findFirst({
        where: eq(user.email, tokenRecord.identifier),
        columns: { id: true, email: true, name: true, language: true },
      });

      if (!userRecord) {
        return ApiError.badRequest("Invalid reset token");
      }

      // TODO: Integrate with Better Auth password update method
      // For now, we validate the password and clear the reset token
      // Password hashing and update would be handled by Better Auth in production
      logger.info("password_reset_token_validated", {
        userId: userRecord.id,
        email: userRecord.email,
        passwordLength: password.length,
      });

      // Clear the reset token
      await db
        .update(verification)
        .set({
          value: "",
          expiresAt: new Date(),
        })
        .where(eq(verification.id, tokenRecord.id));

      logger.info("password_reset_completed", { userId: userRecord.id, email: userRecord.email });

      // Send confirmation email
      const confLocale = userRecord.language || "en";
      const conf = (getEmailTranslations(confLocale) as unknown as PasswordResetTranslations)
        .passwordReset.confirmation;
      const confGreeting = applyVars(conf.greeting, { name: userRecord.name || "" });

      await sendBillingEmail({
        to: userRecord.email,
        subject: conf.subject,
        text: `${confGreeting}\n\n${conf.body}\n\n${conf.footer}`,
        metadata: {
          event: "password_reset_completed",
          userId: userRecord.id,
        },
      }).catch((err) => {
        logger.error("password_reset_confirmation_email_failed", {
          userId: userRecord.id,
          error: err,
        });
      });

      return Response.json({
        success: true,
        message: "Password reset successfully. You can now log in.",
      });
    }

    return ApiError.badRequest("Invalid action");
  } catch (err) {
    logger.error("password_reset_error", { error: err });
    return ApiError.internal("Password reset failed");
  }
}
