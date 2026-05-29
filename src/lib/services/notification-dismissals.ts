import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { notificationDismissals } from "@/lib/schema";

// ── Upsert ─────────────────────────────────────────────────────────────────────

export async function upsertDismissal(
  userId: string,
  notificationKey: string,
  snapshotData?: unknown
): Promise<void> {
  try {
    await db
      .insert(notificationDismissals)
      .values({
        id: crypto.randomUUID(),
        userId,
        notificationKey,
        ...(snapshotData !== undefined && { snapshotData }),
      })
      .onConflictDoUpdate({
        target: [notificationDismissals.userId, notificationDismissals.notificationKey],
        set: {
          dismissedAt: new Date(),
          ...(snapshotData !== undefined && { snapshotData }),
        },
      });
  } catch (error) {
    logger.error("Failed to upsert notification dismissal", {
      userId,
      notificationKey,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns a map of notificationKey -> dismissedAt for all dismissals
 * belonging to the given user. Used by layouts to filter out dismissed
 * notifications from banners/feeds.
 */
export async function getDismissedNotifications(userId: string): Promise<Map<string, Date>> {
  const rows = await db.query.notificationDismissals.findMany({
    where: eq(notificationDismissals.userId, userId),
    columns: { notificationKey: true, dismissedAt: true },
  });

  const map = new Map<string, Date>();
  for (const row of rows) {
    map.set(row.notificationKey, row.dismissedAt);
  }
  return map;
}

/**
 * Returns full dismissal records including snapshot_data. Used for
 * suppression logic — e.g. a failed_post banner can compare stored
 * `latestFailureAt` against the current failure timestamp to decide
 * whether to un-suppress.
 */
export async function getDismissedWithSnapshot(
  userId: string
): Promise<Map<string, { dismissedAt: Date; snapshotData: unknown }>> {
  const rows = await db.query.notificationDismissals.findMany({
    where: eq(notificationDismissals.userId, userId),
    columns: { notificationKey: true, dismissedAt: true, snapshotData: true },
  });

  const map = new Map<string, { dismissedAt: Date; snapshotData: unknown }>();
  for (const row of rows) {
    map.set(row.notificationKey, {
      dismissedAt: row.dismissedAt,
      snapshotData: row.snapshotData,
    });
  }
  return map;
}
