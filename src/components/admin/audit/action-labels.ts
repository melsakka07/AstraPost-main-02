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
};

/** Returns Tailwind badge classes for an action's severity level */
export function getActionSeverityClasses(severity: ActionSeverity): string {
  const map: Record<ActionSeverity, string> = {
    critical: "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20",
    high: "bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20",
    medium: "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20",
    low: "bg-muted/50 text-muted-foreground hover:bg-muted",
  };
  return map[severity];
}
