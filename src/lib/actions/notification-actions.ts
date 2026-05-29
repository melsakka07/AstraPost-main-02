"use server";

import { z } from "zod";
import { upsertDismissal } from "@/lib/services/notification-dismissals";
import { getTeamContext } from "@/lib/team-context";

const snapshotSchema = z.object({ latestFailureAt: z.string().datetime() }).strict().optional();

const VALID_KEY_PREFIXES = ["failed_post", "inactive_x_account:", "trial_expiring:"] as const;

function isValidKey(key: string): boolean {
  return VALID_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export async function dismissNotification(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getTeamContext();
  if (!ctx) {
    return { success: false, error: "Unauthorized" };
  }

  const notificationKey = formData.get("notificationKey")?.toString();
  if (!notificationKey) {
    return { success: false, error: "Missing notificationKey" };
  }
  if (!isValidKey(notificationKey)) {
    return { success: false, error: "Invalid notificationKey" };
  }

  const rawSnapshot = formData.get("snapshotData")?.toString();
  let snapshotData: unknown = undefined;
  if (rawSnapshot) {
    try {
      const parsed = JSON.parse(rawSnapshot);
      const result = snapshotSchema.safeParse(parsed);
      if (!result.success) {
        return { success: false, error: "Invalid snapshotData" };
      }
      snapshotData = result.data;
    } catch {
      return { success: false, error: "Invalid snapshotData JSON" };
    }
  }

  try {
    await upsertDismissal(ctx.session.user.id, notificationKey, snapshotData);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to dismiss notification" };
  }
}
