/* eslint-disable no-console */
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { PostFailureEmail } from '@/components/email/post-failure-email';
import { ResetPasswordEmail } from '@/components/email/reset-password-email';
import { VerificationEmail } from '@/components/email/verification-email';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

interface SendEmailInput {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  react?: React.ReactElement;
  metadata?: Record<string, unknown>;
}

export async function sendEmail(input: SendEmailInput) {
  // If Resend is not configured, log to console
  if (!resend) {
    console.warn("Resend API key not found. Email logged to console:", {
      to: input.to,
      subject: input.subject,
      metadata: input.metadata || {},
    });
    if (process.env.NODE_ENV === "development") {
      console.log(`[EMAIL to ${input.to}] Subject: ${input.subject}\nBody: ${input.text || "(HTML content)"}`);
    }
    return;
  }

  try {
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
      text: input.text || '', 
      ...(html ? { html } : {}),
      ...(input.metadata ? { tags: Object.entries(input.metadata).map(([name, value]) => ({ name, value: String(value) })) } : {}),
    });

    if (error) {
      console.error("Failed to send email via Resend:", error);
      throw new Error(`Email sending failed: ${error.message}`);
    }

    console.log(`Email sent successfully to ${input.to}`, data);
    return data;
  } catch (error) {
    console.error("Error sending email:", error);
    return undefined;
  }
}

export async function sendBillingEmail(input: SendEmailInput) {
  await sendEmail(input);
}

export async function sendPostFailureEmail(to: string, postId: string, reason: string) {
  const retryUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/queue`;
  
  await sendEmail({
    to,
    subject: "Action Required: Post Publishing Failed",
    react: PostFailureEmail({ postId, reason, retryUrl }),
    text: `Your post failed to publish.\n\nReason: ${reason}\n\nView Queue to retry: ${retryUrl}`,
    metadata: { postId, reason, type: 'post_failure' },
  });
}

export async function sendVerificationEmail(to: string, url: string, name?: string) {
  await sendEmail({
    to,
    subject: "Verify your email address for AstroPost",
    react: VerificationEmail({ url, name }),
    text: `Welcome to AstroPost! Please verify your email address by clicking here: ${url}`,
    metadata: { type: 'verification' },
  });
}

export async function sendResetPasswordEmail(to: string, url: string, name?: string) {
  await sendEmail({
    to,
    subject: "Reset your password for AstroPost",
    react: ResetPasswordEmail({ url, name }),
    text: `Reset your password by clicking here: ${url}`,
    metadata: { type: 'reset_password' },
  });
}

export async function sendTeamInvitationEmail(to: string, token: string, teamName: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/join-team?token=${token}`;
  
  await sendEmail({
    to,
    subject: `You've been invited to join ${teamName} on AstroPost`,
    text: `You have been invited to join the team "${teamName}".\n\nClick here to join: ${url}\n\nThis link expires in 7 days.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Team Invitation</h2>
        <p>You have been invited to join the team <strong>${teamName}</strong> on AstroPost.</p>
        <p>Click the button below to accept the invitation:</p>
        <a href="${url}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Join Team</a>
        <p style="margin-top: 24px; font-size: 14px; color: #666;">This link expires in 7 days.</p>
      </div>
    `,
    metadata: { type: 'team_invitation', token },
  });
}
