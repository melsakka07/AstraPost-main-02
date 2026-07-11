// ---------------------------------------------------------------------------
// Service Catalog — Production Smoke Tests
// ---------------------------------------------------------------------------
// Read-only, non-destructive smoke tests that verify plan gates are correctly
// enforced against a live (local or remote) server.
//
// Prerequisites:
//   TEST_BASE_URL — base URL of the running server (default: http://localhost:3000)
//   TEST_TOKENS   — JSON object mapping plan types to session tokens
//                    Example: '{"free":"tok_free","trial":"tok_trial","pro_monthly":"tok_pro",...}'
//
// If TEST_TOKENS is not set, ALL tests are skipped with a clear message.
// If a specific plan's token is missing, those test cases are skipped.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  PROD_SMOKE_SERVICES,
  ALL_PLANS,
  type PlanType,
  type ServiceExpectation,
} from "./service-catalog.config";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = (process.env.TEST_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

function getTokens(): Partial<Record<PlanType, string>> {
  if (!process.env.TEST_TOKENS) return {};
  try {
    const parsed = JSON.parse(process.env.TEST_TOKENS);
    if (typeof parsed !== "object" || parsed === null) return {};
    // Filter to only known plan types
    const valid: Partial<Record<PlanType, string>> = {};
    for (const plan of ALL_PLANS) {
      if (typeof parsed[plan] === "string" && parsed[plan].length > 0) {
        valid[plan] = parsed[plan];
      }
    }
    return valid;
  } catch {
    return {};
  }
}

const tokens = getTokens();
const hasTokens = Object.keys(tokens).length > 0;

// ---------------------------------------------------------------------------
// Endpoint selection
// ---------------------------------------------------------------------------
// Curated subset of ~20 read-only endpoints covering all categories:
//   - Ungated (ALL_ACCESS): should return 200 for every plan
//   - Gated (PRO_PLUS_ACCESS): should return 402 for free users
//   - Agency-only: should return 402 for non-agency plans
//
// We use a Set of route paths to pick from PROD_SMOKE_SERVICES rather than
// hardcoding ServiceExpectation objects, so the test automatically picks up
// any access-level changes in the config.
// ---------------------------------------------------------------------------

const SMOKE_ROUTES = new Set([
  // ── Ungated (ALL_ACCESS) ──────────────────────────────────────────────────
  "/api/ai/history",
  "/api/ai/quota",
  "/api/ai/trends",
  "/api/ai/inspiration",
  "/api/ai/youtube-to-thread/capabilities",
  "/api/posts",
  "/api/media/library",
  "/api/analytics/followers",
  "/api/analytics/self-stats",
  "/api/x/accounts",
  "/api/x/health",
  "/api/billing/status",
  "/api/billing/usage",
  "/api/notifications",
  "/api/templates",
  "/api/changelog",
  "/api/announcement",

  // ── Gated (PRO_PLUS_ACCESS) — free plan should get 402 ────────────────────
  "/api/analytics/best-time",
  "/api/analytics/viral",
  "/api/analytics/export",

  // ── Agency-only — non-agency plans should get 402 ─────────────────────────
  "/api/team/members",
]);

const SMOKE_ENDPOINTS: ServiceExpectation[] = PROD_SMOKE_SERVICES.filter(
  (s) => s.route && SMOKE_ROUTES.has(s.route)
);

// ---------------------------------------------------------------------------
// Generate flat test cases: one per (endpoint, plan) pair
// ---------------------------------------------------------------------------

interface TestCase {
  name: string;
  route: string;
  plan: PlanType;
  expectedAllowed: boolean;
  token: string;
}

function buildTestCases(): TestCase[] {
  const cases: TestCase[] = [];
  for (const service of SMOKE_ENDPOINTS) {
    for (const plan of ALL_PLANS) {
      const token = tokens[plan];
      if (!token) continue; // skip plans without a configured token
      cases.push({
        name: service.name,
        route: service.route!,
        plan,
        expectedAllowed: service.access[plan],
        token,
      });
    }
  }
  return cases;
}

const testCases = buildTestCases();

// Map route -> service name for the diagnostic test
const coveredRoutes = new Set(SMOKE_ENDPOINTS.map((s) => s.route!));
const missingRoutes = [...SMOKE_ROUTES].filter((r) => !coveredRoutes.has(r));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function safeBodySnippet(res: Response, maxLen = 200): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, maxLen);
  } catch {
    return "(could not read body)";
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Service Catalog — Production Smoke Tests", () => {
  // ── Informational: token configuration status ────────────────────────────
  it("has TEST_TOKENS configured (informational)", () => {
    if (!hasTokens) {
      console.warn(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
          "  PROD SMOKE TESTS SKIPPED\n" +
          "  Set TEST_TOKENS env var to run prod smoke tests.\n" +
          "  Format: JSON object mapping plan types to session tokens.\n" +
          '  Example: TEST_TOKENS=\'{"free":"<token>","trial":"<token>","pro_monthly":"<token>"}\'\n' +
          "  Plan types: free, trial, pro_monthly, pro_annual, agency\n" +
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );
    } else {
      const configured = Object.keys(tokens).join(", ");
      const missing = ALL_PLANS.filter((p) => !tokens[p]);
      console.warn(
        `Prod smoke: ${testCases.length} test cases across ${SMOKE_ENDPOINTS.length} endpoints. ` +
          `Configured plans: ${configured}. ` +
          (missing.length > 0
            ? `Missing plans (skipped): ${missing.join(", ")}.`
            : "All plans configured.")
      );
    }
    expect(true).toBe(true);
  });

  // ── Diagnostic: all selected routes exist in the config ──────────────────
  it("selected smoke routes exist in PROD_SMOKE_SERVICES", () => {
    if (missingRoutes.length > 0) {
      console.warn(
        `Some SMOKE_ROUTES were not found in PROD_SMOKE_SERVICES: ${missingRoutes.join(", ")}. ` +
          `They may have been removed or changed to mutation endpoints. Update SMOKE_ROUTES in prod-smoke.test.ts.`
      );
    }
    // Always passes — informational only (routes may legitimately change)
    expect(true).toBe(true);
  });

  // ── Actual smoke tests (skipped if no tokens configured) ──────────────────
  describe.skipIf(!hasTokens)(`Prod environment: ${BASE_URL}`, () => {
    it.skipIf(testCases.length === 0)(
      "has at least one endpoint-plan pair with a configured token",
      () => {
        expect(testCases.length).toBeGreaterThan(0);
      }
    );

    it.each(testCases)(
      "$name [$plan] — GET $route",
      async ({ name, route, plan, expectedAllowed, token }) => {
        let res: Response;
        try {
          res = await fetch(`${BASE_URL}${route}`, {
            method: "GET",
            headers: {
              Cookie: `better-auth.session_token=${token}`,
              Accept: "application/json",
            },
            // Don't follow redirects — API routes should never redirect.
            // If a route returns 302/307, that's unexpected and should fail.
            redirect: "manual",
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(
            `Failed to connect to ${BASE_URL}${route}. Is the server running?\n` +
              `Error: ${message}`
          );
        }

        if (expectedAllowed) {
          // Allowed plans: expect 200 (OK), 401 (expired token), or
          // 404 (resource not found — e.g. no X accounts connected yet).
          const bodySnippet = await safeBodySnippet(res);
          expect(
            [200, 401, 404],
            `"${name}" (${route}) — plan "${plan}" should have access.\n` +
              `  Expected: 200 | 401 | 404\n` +
              `  Got:      ${res.status}\n` +
              `  Body:     ${bodySnippet}`
          ).toContain(res.status);
        } else {
          // Denied plans: expect 402 (plan gate denied) or 401 (expired token).
          const bodySnippet = await safeBodySnippet(res);
          expect(
            [402, 401],
            `"${name}" (${route}) — plan "${plan}" should be denied access.\n` +
              `  Expected: 402 | 401\n` +
              `  Got:      ${res.status}\n` +
              `  Body:     ${bodySnippet}`
          ).toContain(res.status);
        }
      },
      30000 // 30s timeout per test case (each makes exactly 1 HTTP request)
    );
  });

  // ── Summary: how many endpoints and plans are covered ────────────────────
  it.skipIf(!hasTokens)("prints coverage summary", () => {
    const byCategory = new Map<string, number>();
    for (const svc of SMOKE_ENDPOINTS) {
      byCategory.set(svc.category, (byCategory.get(svc.category) ?? 0) + 1);
    }
    const categoryLines = [...byCategory.entries()]
      .map(([cat, count]) => `    ${cat}: ${count} endpoints`)
      .join("\n");

    const configuredPlans = Object.keys(tokens).length;
    const totalPlans = ALL_PLANS.length;

    console.warn(
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `  Prod smoke coverage summary\n` +
        `  Server:   ${BASE_URL}\n` +
        `  Endpoints: ${SMOKE_ENDPOINTS.length} (${testCases.length} test cases)\n` +
        `  Plans:    ${configuredPlans}/${totalPlans} configured\n` +
        `${categoryLines}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );
    expect(true).toBe(true);
  });
});
