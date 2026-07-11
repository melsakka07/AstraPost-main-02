#!/usr/bin/env npx tsx
/**
 * Seed test accounts for service-catalog integration testing.
 *
 * Creates 5 test users (free, trial, pro_monthly, pro_annual, agency)
 * with sessions and AI quota grants. Idempotent — deletes existing
 * test users by email before inserting.
 *
 * Usage: npx tsx scripts/seed-test-accounts.ts
 *
 * Output: writes TEST_TOKENS.json to the repo root with session tokens.
 */

import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TEST_EMAIL_DOMAIN = "astrapost-test.local";

interface TestUserSpec {
  planLabel: "free" | "trial" | "pro_monthly" | "pro_annual" | "agency";
  /** DB plan column value — trial users get plan=free with trialEndsAt set */
  dbPlan: "free" | "pro_monthly" | "pro_annual" | "agency";
  name: string;
  email: string;
  /** null = no trial; set = trial until this date */
  trialEndsAt: Date | null;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

const TEST_USERS: TestUserSpec[] = [
  {
    planLabel: "free",
    dbPlan: "free",
    name: "Test Free",
    email: `test-free@${TEST_EMAIL_DOMAIN}`,
    trialEndsAt: null,
  },
  {
    planLabel: "trial",
    dbPlan: "free",
    name: "Test Trial",
    email: `test-trial@${TEST_EMAIL_DOMAIN}`,
    trialEndsAt: daysFromNow(14),
  },
  {
    planLabel: "pro_monthly",
    dbPlan: "pro_monthly",
    name: "Test Pro Monthly",
    email: `test-pro-monthly@${TEST_EMAIL_DOMAIN}`,
    trialEndsAt: null,
  },
  {
    planLabel: "pro_annual",
    dbPlan: "pro_annual",
    name: "Test Pro Annual",
    email: `test-pro-annual@${TEST_EMAIL_DOMAIN}`,
    trialEndsAt: null,
  },
  {
    planLabel: "agency",
    dbPlan: "agency",
    name: "Test Agency",
    email: `test-agency@${TEST_EMAIL_DOMAIN}`,
    trialEndsAt: null,
  },
];

const QUOTA_AMOUNT = 1000;
const SESSION_EXPIRY_DAYS = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message: string, color?: keyof typeof colors) {
  const code = color ? colors[color] : "";
  console.log(`${code}${message}${colors.reset}`);
}

function success(message: string) {
  log(`  OK  ${message}`, "green");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // 1. Load POSTGRES_URL — try dotenv if not already set
  if (!process.env.POSTGRES_URL) {
    try {
      const dotenv = await import("dotenv");
      const envPath = join(process.cwd(), ".env.local");
      dotenv.config({ path: envPath });
      log(`Loaded environment from ${envPath}`, "cyan");
    } catch {
      // dotenv import failed — environment must be set externally
    }
  }

  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    log("ERROR: POSTGRES_URL environment variable is not set.", "red");
    log("Make sure .env.local exists in the repo root and contains POSTGRES_URL.", "red");
    process.exit(1);
  }

  const sql = postgres(connectionString, {
    connect_timeout: 10,
    idle_timeout: 20,
  });

  try {
    // 2. Delete existing test users (cascade removes their sessions + quota grants)
    const testEmails = TEST_USERS.map((u) => u.email);
    log("Cleaning up existing test accounts...");

    const deletedSessions = await sql`
      DELETE FROM session
      WHERE user_id IN (SELECT id FROM "user" WHERE email = ANY(${testEmails}))
    `;
    log(`  Removed ${deletedSessions.count} existing session(s)`);

    const deletedGrants = await sql`
      DELETE FROM ai_quota_grants
      WHERE user_id IN (SELECT id FROM "user" WHERE email = ANY(${testEmails}))
    `;
    log(`  Removed ${deletedGrants.count} existing quota grant(s)`);

    const deletedUsers = await sql`
      DELETE FROM "user"
      WHERE email = ANY(${testEmails})
    `;
    log(`  Removed ${deletedUsers.count} existing test user(s)`);

    // 3. Insert 5 test users
    log("");
    log("Creating test users...");

    const testTokens: Array<{
      plan: string;
      userId: string;
      email: string;
      token: string;
    }> = [];

    for (const spec of TEST_USERS) {
      const userId = `test-${spec.planLabel}-${randomUUID().slice(0, 8)}`;
      const now = new Date();

      // Insert user
      await sql`
        INSERT INTO "user" (
          id, name, email, plan, trial_ends_at,
          email_verified, created_at, updated_at
        ) VALUES (
          ${userId}, ${spec.name}, ${spec.email}, ${spec.dbPlan}, ${spec.trialEndsAt?.toISOString() ?? null},
          true, ${now.toISOString()}, ${now.toISOString()}
        )
      `;

      // Insert session
      const sessionId = randomUUID();
      const sessionToken = randomUUID();
      const sessionExpiry = daysFromNow(SESSION_EXPIRY_DAYS);

      await sql`
        INSERT INTO session (
          id, expires_at, token, created_at, updated_at,
          user_id, ip_address, user_agent
        ) VALUES (
          ${sessionId}, ${sessionExpiry.toISOString()}, ${sessionToken},
          ${now.toISOString()}, ${now.toISOString()},
          ${userId}, ${"127.0.0.1"}, ${"seed-test-accounts/1.0"}
        )
      `;

      // Insert quota grant (self-granted for test simplicity)
      const grantId = randomUUID();
      await sql`
        INSERT INTO ai_quota_grants (
          id, user_id, amount, remaining, granted_by, reason, created_at
        ) VALUES (
          ${grantId}, ${userId}, ${QUOTA_AMOUNT}, ${QUOTA_AMOUNT},
          ${userId}, ${"test-seed"}, ${now.toISOString()}
        )
      `;

      testTokens.push({
        plan: spec.planLabel,
        userId,
        email: spec.email,
        token: sessionToken,
      });

      success(`Created test user: ${userId} (${spec.planLabel})`);
    }

    // 4. Write TEST_TOKENS.json
    const outputPath = join(process.cwd(), "TEST_TOKENS.json");
    writeFileSync(outputPath, JSON.stringify(testTokens, null, 2) + "\n");
    log("");
    success(`Wrote ${testTokens.length} tokens to TEST_TOKENS.json`);

    // 5. Summary
    log("");
    log("Test accounts ready:", "cyan");
    for (const t of testTokens) {
      log(`  ${t.plan.padEnd(14)} ${t.userId.padEnd(30)} token=${t.token}`);
    }
    log("");
    log("Use the tokens in Authorization header:", "cyan");
    log("  Authorization: Bearer <token>");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  log(`Fatal error: ${err instanceof Error ? err.message : String(err)}`, "red");
  process.exit(1);
});
