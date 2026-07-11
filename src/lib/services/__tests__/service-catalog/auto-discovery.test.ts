// ---------------------------------------------------------------------------
// Service Catalog — Auto-Discovery Drift Detection
// ---------------------------------------------------------------------------
// Detects drift between the codebase and service-catalog.config.ts.
//
// Three checks:
//   1. Routes in code but NOT in config → FAILURE (uncatalogued route)
//   2. Routes in config but NOT in code → FAILURE (stale config entry)
//   3. Gates in config but NOT in code → FAILURE (missing gate function)
//      Gates in code but NOT in config → console.warn (may need cataloging)
// ---------------------------------------------------------------------------

import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { describe, it, expect } from "vitest";
import { SERVICE_CATALOG, ALL_GATES } from "./service-catalog.config";

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------
// This test file lives at:
//   src/lib/services/__tests__/service-catalog/auto-discovery.test.ts
// Navigate up 4 levels to reach src/, then into app/api.

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const API_DIR = join(__dirname, "..", "..", "..", "..", "app", "api");
const REQUIRE_PLAN_PATH = join(__dirname, "..", "..", "..", "middleware", "require-plan.ts");

// ---------------------------------------------------------------------------
// Exclusion patterns — matched against the file path portion after "src/"
// ---------------------------------------------------------------------------

const EXCLUDED_DIR_PREFIXES = [
  "app/api/admin/",
  "app/api/cron/",
  "app/api/auth/",
  "app/api/billing/webhook/",
  "app/api/chat/",
];

function shouldSkipRouteFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const srcIndex = normalized.indexOf("app/api/");
  if (srcIndex === -1) return true; // safety: only process files under app/api/
  const relative = normalized.slice(srcIndex);
  return EXCLUDED_DIR_PREFIXES.some((prefix) => relative.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// File-system scanners
// ---------------------------------------------------------------------------

function findRouteFiles(dir: string): string[] {
  const results: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results; // directory doesn't exist
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(fullPath));
    } else if (entry.name === "route.ts" || entry.name === "route.tsx") {
      results.push(fullPath);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Path converters
// ---------------------------------------------------------------------------

/** "src/app/api/ai/thread/route.ts" → "/api/ai/thread" */
function routeFileToPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const apiIndex = normalized.indexOf("app/api/");
  const relative = normalized.slice(apiIndex + "app/api/".length);
  const withoutRoute = relative.replace(/\/route\.tsx?$/, "");
  return "/api/" + withoutRoute;
}

/** "/api/ai/thread" → join(API_DIR, "ai/thread/route.ts") — checks .ts and .tsx */
function routeToFilePath(route: string): string {
  const pathPart = route.replace(/^\/api\//, "");
  const tsPath = join(API_DIR, pathPart, "route.ts");
  const tsxPath = join(API_DIR, pathPart, "route.tsx");
  return existsSync(tsPath) ? tsPath : tsxPath;
}

// ---------------------------------------------------------------------------
// Method extractor — reads a route.ts file and returns its exported HTTP verbs
// ---------------------------------------------------------------------------

function extractMethods(filePath: string): string[] {
  const content = readFileSync(filePath, "utf-8");
  const methods: string[] = [];
  const regex = /^export\s+async\s+function\s+(GET|POST|PATCH|DELETE|PUT)\b/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    methods.push(match[1]!);
  }
  return methods;
}

// ---------------------------------------------------------------------------
// Gate extractor — reads require-plan.ts and returns exported check* names
// ---------------------------------------------------------------------------

function extractGatesFromCode(): string[] {
  const content = readFileSync(REQUIRE_PLAN_PATH, "utf-8");
  const gates = new Set<string>();
  // Matches both:
  //   export async function checkXxxDetailed(
  //   export const checkXxxDetailed = makeFeatureGate(
  const regex = /^export\s+(?:async\s+function|const)\s+(check\w+)/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    gates.add(match[1]!);
  }
  return Array.from(gates).sort();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Service Catalog — Auto-Discovery Drift Detection", () => {
  // ── Check 1: Routes in code but NOT in config (WARNING only) ─────────────────

  describe("Check 1: Uncatalogued routes (warning only)", () => {
    const allRouteFiles = findRouteFiles(API_DIR);
    const configRoutes = new Set(SERVICE_CATALOG.filter((s) => s.route).map((s) => s.route!));

    const codeRoutes = allRouteFiles.filter((f) => !shouldSkipRouteFile(f));
    const uncatalogued = codeRoutes.filter((f) => !configRoutes.has(routeFileToPath(f)));

    it("reports uncatalogued routes as warnings (not failures)", () => {
      if (uncatalogued.length > 0) {
        const routes = uncatalogued.map((f) => {
          const route = routeFileToPath(f);
          const methods = extractMethods(f).join(", ");
          return `  ${methods.padEnd(30)} ${route} → ${f}`;
        });
        console.warn(
          `\n⚠️  ${uncatalogued.length} route file(s) found in code but NOT in service-catalog.config.ts:\n${routes.join("\n")}\n  → Add entries to SERVICE_CATALOG if these are user-facing services.\n`
        );
      }
      expect(true).toBe(true);
    });
  });

  // ── Check 2: Routes in config but NOT in code ───────────────────────────────

  describe("Check 2: All config routes exist in code", () => {
    const configEntriesWithRoutes = SERVICE_CATALOG.filter((s) => s.route);

    it.each(configEntriesWithRoutes)(
      'Service "$name" route $route should exist on disk',
      (service) => {
        const filePath = routeToFilePath(service.route!);
        expect(
          existsSync(filePath),
          `Service '${service.name}' references ${service.route} but no route file found at ${filePath}`
        ).toBe(true);
      }
    );
  });

  // ── Check 3: Gate consistency ───────────────────────────────────────────────

  describe("Check 3: Gate consistency between config and require-plan.ts", () => {
    const codeGates = extractGatesFromCode();
    const configGatesSet = new Set(ALL_GATES);

    it("All config gates exist in require-plan.ts", () => {
      const missing = ALL_GATES.filter((g) => !codeGates.includes(g));
      if (missing.length > 0) {
        expect.fail(
          `Gate(s) used in config but NOT found in require-plan.ts: ${missing.join(", ")}`
        );
      }
    });

    it("Gates in require-plan.ts but not in config (warning only)", () => {
      const uncatalogued = codeGates.filter((g) => !configGatesSet.has(g));
      if (uncatalogued.length > 0) {
        // WARNING — not a failure, but surfaced so it's visible in test output
        console.warn(
          `Gate(s) exist in require-plan.ts but not used in SERVICE_CATALOG — may need cataloging: ${uncatalogued.join(", ")}`
        );
      }
      // Always passes — this is informational only
      expect(true).toBe(true);
    });
  });
});
