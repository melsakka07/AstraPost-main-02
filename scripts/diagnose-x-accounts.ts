import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { xAccounts, user } from "@/lib/schema";
import { logger } from "@/lib/logger";

type TokenStatus = "HEALTHY" | "EXPIRING_SOON" | "EXPIRED" | "NO_REFRESH_TOKEN" | "UNKNOWN";

type NotifyState =
  | "healthy"
  | "pending-level-1"
  | "awaiting-escalation"
  | "pending-level-2"
  | "notified";

interface AccountReport {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  tokenStatus: TokenStatus;
  expiresAt: Date | null;
  tier: string;
  consecutiveRefreshFailures: number;
  lastNotifiedFailureCount: number | null;
  notifyState: NotifyState;
}

async function main() {
  const args = process.argv.slice(2);
  const fixMode = args.includes("--fix");

  const rows = await db
    .select({
      id: xAccounts.id,
      username: xAccounts.xUsername,
      isActive: xAccounts.isActive,
      refreshTokenEnc: xAccounts.refreshTokenEnc,
      tokenExpiresAt: xAccounts.tokenExpiresAt,
      tier: xAccounts.xSubscriptionTier,
      email: user.email,
      consecutiveRefreshFailures: xAccounts.consecutiveRefreshFailures,
      lastNotifiedFailureCount: xAccounts.lastNotifiedFailureCount,
    })
    .from(xAccounts)
    .innerJoin(user, eq(xAccounts.userId, user.id))
    .orderBy(xAccounts.xUsername);

  const reports: AccountReport[] = rows.map((row) => {
    const now = new Date();
    const expiresAt = row.tokenExpiresAt;
    const hasRefresh = !!row.refreshTokenEnc;

    let tokenStatus: TokenStatus;
    if (!hasRefresh) {
      tokenStatus = "NO_REFRESH_TOKEN";
    } else if (expiresAt && expiresAt < now) {
      tokenStatus = "EXPIRED";
    } else if (expiresAt && expiresAt.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      tokenStatus = "EXPIRING_SOON";
    } else if (!expiresAt) {
      tokenStatus = "UNKNOWN";
    } else {
      tokenStatus = "HEALTHY";
    }

    const consecutiveRefreshFailures = row.consecutiveRefreshFailures ?? 0;
    const lastNotifiedFailureCount = row.lastNotifiedFailureCount ?? null;

    let notifyState: NotifyState;
    if (consecutiveRefreshFailures === 0) {
      notifyState = "healthy";
    } else if (consecutiveRefreshFailures === 1) {
      notifyState = lastNotifiedFailureCount === 1 ? "notified" : "pending-level-1";
    } else if (consecutiveRefreshFailures === 2) {
      notifyState = "awaiting-escalation";
    } else {
      notifyState =
        lastNotifiedFailureCount === consecutiveRefreshFailures ? "notified" : "pending-level-2";
    }

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      isActive: row.isActive ?? false,
      tokenStatus,
      expiresAt,
      tier: row.tier ?? "None",
      consecutiveRefreshFailures,
      lastNotifiedFailureCount,
      notifyState,
    };
  });

  console.log(`\nX Accounts (${reports.length} total)\n`);
  console.log("─".repeat(80));

  let criticalCount = 0;
  let warningCount = 0;
  let deactivatedCount = 0;
  let inactiveCount = 0;

  for (const r of reports) {
    const isCritical = r.tokenStatus === "NO_REFRESH_TOKEN" || r.tokenStatus === "EXPIRED";
    const isWarning = r.tokenStatus === "EXPIRING_SOON" || r.tokenStatus === "UNKNOWN";

    if (!r.isActive) {
      inactiveCount++;
    } else if (isCritical) {
      criticalCount++;
    } else if (isWarning) {
      warningCount++;
    }

    let flag: string;
    if (!r.isActive) {
      flag = "INACTIVE";
    } else if (isCritical) {
      flag = "CRITICAL";
    } else if (isWarning) {
      flag = "WARNING";
    } else {
      flag = "OK";
    }

    console.log(`  @${r.username}`);
    console.log(`    ID:      ${r.id}`);
    console.log(`    Email:   ${r.email}`);
    console.log(`    Active:  ${r.isActive}`);
    console.log(
      `    Token:   ${r.tokenStatus}${r.expiresAt ? ` (expires ${r.expiresAt.toISOString()})` : ""}`
    );
    console.log(`    Tier:    ${r.tier}`);
    console.log(`    Status:  ${flag}`);

    if (fixMode && r.isActive && isCritical) {
      await db.update(xAccounts).set({ isActive: false }).where(eq(xAccounts.id, r.id));
      console.log(`    ACTION:  Deactivated (isActive = false)`);
      deactivatedCount++;
      logger.info("diagnose_x_account_deactivated", {
        xAccountId: r.id,
        username: r.username,
        reason: r.tokenStatus,
      });
    }

    console.log();
  }

  console.log("─".repeat(80));
  const healthyCount = reports.length - criticalCount - warningCount - inactiveCount;
  const parts: string[] = [];
  if (criticalCount > 0) parts.push(`${criticalCount} critical`);
  if (warningCount > 0) parts.push(`${warningCount} warning`);
  if (inactiveCount > 0) parts.push(`${inactiveCount} inactive`);
  parts.push(`${healthyCount} healthy`);
  console.log(`Summary: ${parts.join(", ")}`);

  if (fixMode) {
    console.log(`Fix mode: ${deactivatedCount} account(s) deactivated`);
  } else if (criticalCount > 0) {
    console.log("Run with --fix to deactivate critical accounts (NO_REFRESH_TOKEN or EXPIRED)");
  }

  // Refresh-failure distribution (new model: token-warning UX gate)
  console.log();
  console.log("─".repeat(80));
  console.log("Refresh-Failure Distribution (token-warning email gate)");
  console.log("─".repeat(80));

  const byState: Record<NotifyState, number> = {
    healthy: 0,
    "pending-level-1": 0,
    "awaiting-escalation": 0,
    "pending-level-2": 0,
    notified: 0,
  };
  for (const r of reports) byState[r.notifyState]++;

  for (const state of [
    "healthy",
    "pending-level-1",
    "awaiting-escalation",
    "pending-level-2",
    "notified",
  ] as const) {
    console.log(`  ${state.padEnd(22)} ${byState[state]}`);
  }

  const nonHealthy = reports.filter((r) => r.notifyState !== "healthy").slice(0, 5);
  if (nonHealthy.length > 0) {
    console.log();
    console.log(`Sample of first ${nonHealthy.length} non-healthy:`);
    for (const r of nonHealthy) {
      console.log(
        `  @${r.username.padEnd(20)} active=${r.isActive} failures=${r.consecutiveRefreshFailures} lastNotified=${r.lastNotifiedFailureCount ?? "null"} state=${r.notifyState}`
      );
    }
  }
  console.log();

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
