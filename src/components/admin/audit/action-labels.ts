import type { adminAuditActionEnum } from "@/lib/schema";

export type AuditAction = (typeof adminAuditActionEnum.enumValues)[number];
export type ActionSeverity = "low" | "medium" | "high" | "critical";

export const ACTION_LABELS: Record<AuditAction, string> = {
  ban: "Banned User",
  unban: "Unbanned User",
  delete_user: "Deleted User",
  suspend: "Suspended User",
  unsuspend: "Unsuspended User",
  impersonate_start: "Impersonation Started",
  impersonate_end: "Impersonation Ended",
  plan_change: "Plan Changed",
  feature_flag_toggle: "Feature Flag Toggled",
  promo_create: "Promo Code Created",
  promo_update: "Promo Code Updated",
  promo_delete: "Promo Code Deleted",
  announcement_update: "Announcement Updated",
  subscriber_create: "Subscriber Created",
  subscriber_update: "Subscriber Updated",
  roadmap_update: "Roadmap Updated",
  bulk_operation: "Bulk Operation",
  user_update: "User Account Updated",
  post_update: "Post Updated",
  webhook_replay: "Webhook Replayed",
};

export const ACTION_DESCRIPTIONS: Record<AuditAction, string> = {
  ban: "Blocked from logging in; all active sessions invalidated.",
  unban: "Login access restored.",
  delete_user: "Account soft-deleted, PII anonymised, all sessions invalidated.",
  suspend: "Temporarily suspended; cannot log in.",
  unsuspend: "Suspension lifted; login restored.",
  impersonate_start: "Admin assumed this user's identity and can act on their behalf.",
  impersonate_end: "Admin impersonation session ended.",
  plan_change: "Subscription plan manually overridden by admin.",
  feature_flag_toggle: "Platform feature flag state changed.",
  promo_create: "New promotional discount code added.",
  promo_update: "Promotional code settings modified.",
  promo_delete: "Promotional code permanently removed.",
  announcement_update: "Public-facing announcement message changed.",
  subscriber_create: "New user account manually added by admin.",
  subscriber_update: "User account details modified by admin.",
  roadmap_update: "Product roadmap item added or modified.",
  bulk_operation: "Mass action applied to multiple users simultaneously.",
  user_update: "User account details modified by admin (e.g. restore, edit).",
  post_update: "Post details modified by admin (e.g. restore).",
  webhook_replay: "Failed Stripe webhook replayed through handler.",
};

export const ACTION_SEVERITY: Record<AuditAction, ActionSeverity> = {
  ban: "high",
  unban: "medium",
  delete_user: "critical",
  suspend: "high",
  unsuspend: "medium",
  impersonate_start: "critical",
  impersonate_end: "high",
  plan_change: "medium",
  feature_flag_toggle: "medium",
  promo_create: "low",
  promo_update: "low",
  promo_delete: "medium",
  announcement_update: "low",
  subscriber_create: "low",
  subscriber_update: "medium",
  roadmap_update: "low",
  bulk_operation: "high",
  user_update: "medium",
  post_update: "medium",
  webhook_replay: "high",
};

/** Returns Tailwind badge classes for an action's severity level */
export function getActionSeverityClasses(severity: ActionSeverity): string {
  const map: Record<ActionSeverity, string> = {
    critical: "bg-danger-3 text-danger-11 hover:bg-danger-4",
    high: "bg-warning-3 text-warning-11 hover:bg-warning-4",
    medium: "bg-info-3 text-info-11 hover:bg-info-4",
    low: "bg-muted/50 text-muted-foreground hover:bg-muted",
  };
  return map[severity];
}
