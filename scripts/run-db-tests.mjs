/**
 * Runs the real-database integration tests (admin-ai-metrics) with RUN_DB_TESTS=1.
 *
 * Loads .env so POSTGRES_URL is available locally (dotenv does NOT override
 * variables already set by CI). Cross-platform — no `cross-env` dependency.
 *
 * Usage: pnpm test:db   (requires a reachable Postgres at POSTGRES_URL)
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";

process.env.RUN_DB_TESTS = "1";

const result = spawnSync(
  "pnpm",
  ["exec", "vitest", "run", "src/lib/services/__tests__/admin-ai-metrics.db.test.ts"],
  { stdio: "inherit", env: process.env, shell: true }
);

process.exit(result.status ?? 1);
