#!/usr/bin/env node

// ---------------------------------------------------------------------------
// Service Catalog Test Orchestrator
// ---------------------------------------------------------------------------
// Runs the full service-catalog test suite in the correct order:
//   1. Auto-discovery (drift detection) — always runs, catches stale config
//   2. Gate unit tests (fast, no server needed) — always runs
//   3. Integration tests (HTTP, needs dev server + seeded DB) — opt-in
//   4. Production smoke tests (read-only against remote) — opt-in
//
// Usage:
//   node scripts/run-service-catalog-tests.mjs              # default: unit only
//   RUN_INTEGRATION_TESTS=1 node scripts/...                # unit + integration
//   TEST_BASE_URL=https://... TEST_TOKENS='{...}' node ...  # prod smoke
// ---------------------------------------------------------------------------

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const TEST_DIR = "src/lib/services/__tests__/service-catalog";

const SUITES = [
  {
    name: "auto-discovery",
    files: [`${TEST_DIR}/auto-discovery.test.ts`],
    required: true,
    env: {},
  },
  {
    name: "gate-unit",
    files: [`${TEST_DIR}/gate-unit.test.ts`],
    required: true,
    env: {},
  },
  {
    name: "route-integration",
    files: [`${TEST_DIR}/route-integration.test.ts`],
    required: false,
    gate: "RUN_INTEGRATION_TESTS",
    env: { RUN_INTEGRATION_TESTS: "1" },
  },
  {
    name: "prod-smoke",
    files: [`${TEST_DIR}/prod-smoke.test.ts`],
    required: false,
    gate: "TEST_TOKENS",
    env: {},
  },
];

function runVitest(files, env, label) {
  return new Promise((resolvePromise) => {
    const args = ["vitest", "run", ...files];
    console.log(`\n━━━ ${label} ━━━`);
    console.log(`  npx ${args.join(" ")}\n`);

    const child = spawn("npx", args, {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, ...env },
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`  ✅ ${label} passed\n`);
        resolvePromise(true);
      } else {
        console.log(`  ❌ ${label} failed (exit ${code})\n`);
        resolvePromise(false);
      }
    });
  });
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Service Catalog Test Suite");
  console.log("═══════════════════════════════════════════");

  let allPassed = true;

  for (const suite of SUITES) {
    const shouldRun = suite.required || process.env[suite.gate];

    if (!shouldRun) {
      const gateNote = suite.gate ? `(set ${suite.gate}=1 to enable)` : "";
      console.log(`  ⏭️  Skipping ${suite.name} ${gateNote}`);
      continue;
    }

    // Check that test files exist
    const missing = suite.files.filter((f) => !existsSync(resolve(ROOT, f)));
    if (missing.length > 0) {
      console.error(`  ❌ Missing test files for ${suite.name}:`);
      missing.forEach((f) => console.error(`     - ${f}`));
      allPassed = false;
      continue;
    }

    const passed = await runVitest(suite.files, suite.env, suite.name);
    if (!passed) allPassed = false;
  }

  console.log("═══════════════════════════════════════════");
  if (allPassed) {
    console.log("  ✅ All tests passed");
    console.log("═══════════════════════════════════════════\n");
    process.exit(0);
  } else {
    console.log("  ❌ Some tests failed");
    console.log("═══════════════════════════════════════════\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Orchestrator error:", err.message);
  process.exit(1);
});
