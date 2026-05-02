import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { xAccounts, user } from "@/lib/schema";
import { logger } from "@/lib/logger";

type TokenStatus = "HEALTHY" | "EXPIRING_SOON" | "EXPIRED" | "NO_REFRESH_TOKEN" | "UNKNOWN";

interface AccountReport {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  tokenStatus: TokenStatus;
  expiresAt: Date | null;
  tier: string;
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

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      isActive: row.isActive ?? false,
      tokenStatus,
      expiresAt,
      tier: row.tier ?? "None",
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
  console.log();

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
