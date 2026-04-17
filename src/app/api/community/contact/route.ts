import { headers } from "next/headers";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/services/email";

// ── Validation ──────────────────────────────────────────────────────────────

const contactSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().max(254).toLowerCase().trim(),
  category: z.enum(["general", "bug", "feature", "partnership", "billing"]),
  subject: z.string().min(5).max(150).trim(),
  message: z.string().min(20).max(2000).trim(),
});

// ── Rate limiting ────────────────────────────────────────────────────────────
// Simple in-memory sliding-window: max 3 submissions per IP per hour.
// For a distributed/multi-instance deployment, swap for Redis-based limiting.
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT = 3;
const ipTimestamps = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const times = (ipTimestamps.get(ip) ?? []).filter((t) => t > cutoff);
  if (times.length >= RATE_LIMIT) return true;
  times.push(now);
  ipTimestamps.set(ip, times);
  return false;
}

// ── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  general: "General Question",
  bug: "Bug Report",
  feature: "Feature Request",
  partnership: "Partnership / Business",
  billing: "Billing & Plans",
};

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // Resolve client IP for rate limiting
  const reqHeaders = await headers();
  const ip =
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    reqHeaders.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return ApiError.tooManyRequests("Too many requests. Please wait before submitting again.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiError.badRequest("Invalid JSON");
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return ApiError.badRequest(parsed.error.issues);
  }

  const { name, email, category, subject, message } = parsed.data;
  const categoryLabel = CATEGORY_LABELS[category] ?? category;
  const supportEmail = process.env.RESEND_FROM_EMAIL ?? "support@astrapost.app";

  try {
    // Notification email to the support team
    await sendEmail({
      to: supportEmail,
      subject: `[${categoryLabel}] ${subject}`,
      text: [
        `New contact form submission from AstraPost community page.`,
        ``,
        `Name:     ${name}`,
        `Email:    ${email}`,
        `Category: ${categoryLabel}`,
        `Subject:  ${subject}`,
        ``,
        `Message:`,
        message,
        ``,
        `— AstraPost Contact Form`,
      ].join("\n"),
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
          <h2 style="margin-bottom:4px">[${categoryLabel}] ${subject}</h2>
          <p style="color:#666;font-size:14px;margin-top:0">New contact form submission</p>
          <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:16px">
            <tr><td style="padding:6px 0;color:#666;width:80px">Name</td><td>${name}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:6px 0;color:#666">Category</td><td>${categoryLabel}</td></tr>
          </table>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:14px">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          <p style="margin-top:16px;font-size:12px;color:#999">Sent from AstraPost community contact form — ${new Date().toISOString()}</p>
        </div>
      `,
      metadata: { type: "community_contact", category, email },
    });

    // Auto-reply to the sender
    await sendEmail({
      to: email,
      subject: `We received your message — AstraPost Support`,
      text: [
        `Hi ${name},`,
        ``,
        `Thanks for reaching out! We've received your message and will get back to you within 1–2 business days.`,
        ``,
        `Your inquiry: ${subject}`,
        `Category: ${categoryLabel}`,
        ``,
        `If your question is urgent, you can also reach us via our Discord community.`,
        ``,
        `Best,`,
        `The AstraPost Team`,
      ].join("\n"),
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
          <h2>We got your message!</h2>
          <p>Hi ${name},</p>
          <p>Thanks for reaching out. We've received your message and will get back to you within <strong>1–2 business days</strong>.</p>
          <div style="background:#f5f5f5;border-radius:8px;padding:12px 16px;margin:16px 0">
            <p style="margin:0 0 4px;font-size:13px;color:#666">Your inquiry</p>
            <p style="margin:0;font-weight:600">${subject}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#666">Category: ${categoryLabel}</p>
          </div>
          <p>If your question is urgent, you can also reach us via our <a href="https://discord.gg/astrapost">Discord community</a>.</p>
          <p style="margin-top:32px;font-size:13px;color:#666">Best,<br>The AstraPost Team</p>
        </div>
      `,
      metadata: { type: "community_contact_autoreply", category },
    });

    logger.info("community_contact_submitted", { category, ip });
    return Response.json({ success: true });
  } catch (error) {
    logger.warn("community_contact_email_failed", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    // Return success to the user even if email delivery fails — the form data
    // was valid and we don't want to expose email infrastructure failures.
    return Response.json({ success: true });
  }
}
