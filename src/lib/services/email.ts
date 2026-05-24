import { render } from "@react-email/render";
import { Resend } from "resend";
import { AccountDeactivatedEmail } from "@/components/email/account-deactivated-email";
import { TrialEndingSoonEmail } from "@/components/email/billing/trial-ending-soon-email";
import { PostFailureEmail } from "@/components/email/post-failure-email";
import { TokenExpiringEmail } from "@/components/email/token-expiring-email";
import { logger } from "@/lib/logger";
import { getEmailTranslations } from "./email-translations";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

interface SendEmailInput {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  react?: React.ReactElement;
  metadata?: Record<string, unknown>;
}

export async function sendEmail(input: SendEmailInput) {
  // If Resend is not configured, log to logger
  if (!resend) {
    logger.warn("email_resend_not_configured", {
      to: input.to,
      subject: input.subject,
      metadata: input.metadata || {},
    });
    if (process.env.NODE_ENV === "development") {
      logger.info("email_dev_log", {
        to: input.to,
        subject: input.subject,
        body: input.text || "(HTML content)",
      });
    }
    return;
  }

  let html = input.html;
  if (input.react) {
    html = await render(input.react);
  }

  if (!html && !input.text) {
    throw new Error("Email must have either HTML or text content");
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: input.to,
    subject: input.subject,
    text: input.text || "",
    ...(html ? { html } : {}),
    ...(input.metadata
      ? {
          tags: Object.entries(input.metadata).map(([name, value]) => ({
            name: name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 256),
            value: String(value)
              .replace(/[^a-zA-Z0-9_-]/g, "_")
              .slice(0, 256),
          })),
        }
      : {}),
  });

  if (error) {
    logger.error("email_send_failed", { error });
    throw new Error(`Email sending failed: ${error.message}`);
  }

  logger.info("email_sent", { to: input.to, data });
  return data;
}

export async function sendBillingEmail(input: SendEmailInput) {
  await sendEmail(input);
}

export async function sendPostFailureEmail(
  to: string,
  postId: string,
  reason: string,
  locale: string = "en"
) {
  const retryUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/queue`;
  const t = getEmailTranslations(locale);

  await sendEmail({
    to,
    subject: t.post_failure.subject,
    react: PostFailureEmail({ postId, reason, retryUrl, locale }),
    text: `${t.post_failure.body}\n\n${t.post_failure.reason_label}: ${reason}\n\n${t.post_failure.view_queue}: ${retryUrl}\n\n${t.post_failure.post_id}: ${postId}`,
    metadata: { postId, reason, type: "post_failure" },
  });
}

export interface AtRiskPostsSummary {
  count: number;
  nextScheduledAt: Date | null;
}

function applyPlaceholders(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.split(`{${key}}`).join(String(value)),
    template
  );
}

function formatNextScheduled(date: Date | null, locale: string): string {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar" : locale, {
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function buildAtRiskBlock(
  template: { one: string; other: string; nextScheduled: string },
  atRiskPosts: AtRiskPostsSummary,
  xUsername: string,
  locale: string
): string | null {
  if (atRiskPosts.count <= 0) return null;
  const base = applyPlaceholders(atRiskPosts.count === 1 ? template.one : template.other, {
    count: atRiskPosts.count,
    xUsername,
  });
  if (atRiskPosts.nextScheduledAt) {
    const next = applyPlaceholders(template.nextScheduled, {
      date: formatNextScheduled(atRiskPosts.nextScheduledAt, locale),
    });
    return `${base}\n${next}`;
  }
  return base;
}

export async function sendTokenExpiringEmail(
  to: string,
  xUsername: string,
  level: 1 | 2,
  atRiskPosts: AtRiskPostsSummary,
  locale: string = "en"
) {
  const reconnectUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings/integrations`;
  const t = getEmailTranslations(locale);
  const tw = t.tokenWarning;
  const levelStrings = level === 2 ? tw.levelUrgent : tw.levelNotice;

  const subject = applyPlaceholders(levelStrings.subject, { xUsername });
  const heading = applyPlaceholders(levelStrings.heading, { xUsername });
  const body = applyPlaceholders(levelStrings.body, { xUsername });
  const cta: string = levelStrings.cta;
  const atRiskBlock = buildAtRiskBlock(tw.atRiskPosts, atRiskPosts, xUsername, locale);

  const textParts = [heading, body];
  if (atRiskBlock) textParts.push(atRiskBlock);
  textParts.push(`${cta}: ${reconnectUrl}`);

  await sendEmail({
    to,
    subject,
    react: TokenExpiringEmail({
      xUsername,
      level,
      atRiskPosts,
      reconnectUrl,
      locale,
    }),
    text: textParts.join("\n\n"),
    metadata: {
      xUsername,
      level: String(level),
      atRiskCount: String(atRiskPosts.count),
      type: "token_expiring",
    },
  });
}

export async function sendAccountDeactivatedEmail(
  to: string,
  xUsername: string,
  atRiskPosts: AtRiskPostsSummary,
  locale: string = "en"
) {
  const reconnectUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings/integrations`;
  const t = getEmailTranslations(locale);
  const atRiskBlock = buildAtRiskBlock(
    t.accountDeactivated.atRiskPosts,
    atRiskPosts,
    xUsername,
    locale
  );

  const subject = applyPlaceholders(t.account_deactivated.subject, { username: xUsername });
  const body = applyPlaceholders(t.account_deactivated.body, { username: `@${xUsername}` });

  const textParts = [body, t.account_deactivated.impact];
  if (atRiskBlock) textParts.push(atRiskBlock);
  textParts.push(reconnectUrl);

  await sendEmail({
    to,
    subject,
    react: AccountDeactivatedEmail({
      xUsername,
      reconnectUrl,
      atRiskPosts,
      locale,
    }),
    text: textParts.join("\n\n"),
    metadata: { xUsername, atRiskCount: String(atRiskPosts.count), type: "account_deactivated" },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendTrialEndingSoonEmail(
  to: string,
  userName: string,
  locale: string = "en"
) {
  await sendEmail({
    to,
    subject: `${getEmailTranslations(locale).trial_ending_soon.subject}`,
    react: TrialEndingSoonEmail({ userName, locale }),
    metadata: { type: "trial_ending_soon" },
  });
}

export async function sendTeamInvitationEmail(
  to: string,
  token: string,
  teamName: string,
  locale: string = "en"
) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/join-team?token=${token}`;
  const t = getEmailTranslations(locale);
  const isRtl = locale === "ar";
  const safeTeamName = escapeHtml(teamName);

  await sendEmail({
    to,
    subject: t.team_invite.subject.replace("{teamName}", safeTeamName),
    text: `${t.team_invite.body}\n\n${t.team_invite.team_name_label}: ${safeTeamName}\n\n${url}\n\n${t.team_invite.expires}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;${isRtl ? " direction: rtl; text-align: right;" : ""}">
        <h2>${t.team_invite.subject.replace("{teamName}", safeTeamName)}</h2>
        <p>${t.team_invite.body}</p>
        <p>${t.team_invite.team_name_label}: <strong>${safeTeamName}</strong></p>
        <p>${t.common.greeting_no_name}</p>
        <a href="${escapeHtml(url)}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">${t.team_invite.join_button}</a>
        <p style="margin-top: 24px; font-size: 14px; color: #666;">${t.team_invite.expires}</p>
      </div>
    `,
    metadata: { type: "team_invitation" },
  });
}
