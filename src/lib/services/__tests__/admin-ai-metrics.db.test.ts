/**
 * Real-database integration test for the admin AI-metrics queries that power
 * `/admin/ai-cost` and `/admin/ai-metrics`.
 *
 * WHY THIS EXISTS: every function in `admin-ai-metrics.ts` wraps its query in
 * `try { ... } catch (error) { logger.error(...); return <empty> }`. That means a
 * broken query (e.g. an ORDER BY referencing a non-existent alias → Postgres
 * 42703, or misreading a `db.execute()` result shape → TypeError) does NOT throw —
 * it silently returns an empty result and the admin page just looks blank. Those
 * bugs are invisible to mock-based unit tests because the mock never runs the SQL.
 *
 * This suite runs each function against a REAL Postgres (empty schema is fine —
 * the SQL still parses, plans, and executes) and fails if any function logs an
 * error, i.e. if it hit the silent catch path.
 *
 * GATING: runs only when RUN_DB_TESTS=1 (set by `pnpm test:db` and the CI
 * `db-tests` job). The default `pnpm test` skips it entirely, so contributors
 * without a database are unaffected. All DB imports are deferred to `beforeAll`
 * so merely collecting this file never touches `db.ts` (which throws without
 * POSTGRES_URL).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const RUN = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!RUN)("admin-ai-metrics — real DB integration", () => {
  let M: typeof import("@/lib/services/admin-ai-metrics");
  let logger: (typeof import("@/lib/logger"))["logger"];
  let dbClient: (typeof import("@/lib/db"))["dbClient"];
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    [M, { logger }, { dbClient }] = await Promise.all([
      import("@/lib/services/admin-ai-metrics"),
      import("@/lib/logger"),
      import("@/lib/db"),
    ]);
    // Fail fast with a clear message if the database is unreachable, so a
    // connection problem is never mistaken for a query bug.
    try {
      await dbClient`SELECT 1`;
    } catch (err) {
      throw new Error(
        `RUN_DB_TESTS=1 but the database is unreachable (POSTGRES_URL). ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  });

  afterAll(async () => {
    await dbClient?.end?.({ timeout: 5 });
  });

  beforeEach(() => {
    // Spy fresh each test so a swallowed DB error is attributable to one
    // function. mockClear() resets call history because vitest returns the same
    // spy instance on repeated spyOn of an already-spied method.
    errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    errorSpy.mockClear();
  });

  /** Asserts the call neither threw nor hit the silent `catch → logger.error` path. */
  function expectNoSwallowedError() {
    if (errorSpy.mock.calls.length > 0) {
      const [msg, meta] = errorSpy.mock.calls[0] as [string, unknown];
      throw new Error(
        `Query failed and was swallowed by its catch block: "${msg}" — ${JSON.stringify(meta)}`
      );
    }
  }

  it("getDailyCost runs", async () => {
    expect(Array.isArray(await M.getDailyCost(7))).toBe(true);
    expectNoSwallowedError();
  });

  it("getTotalCost runs", async () => {
    expect(typeof (await M.getTotalCost(7))).toBe("number");
    expectNoSwallowedError();
  });

  it("getTodayCost runs", async () => {
    expect(typeof (await M.getTodayCost())).toBe("number");
    expectNoSwallowedError();
  });

  it("getTopSpenders runs", async () => {
    expect(Array.isArray(await M.getTopSpenders(7, 10))).toBe(true);
    expectNoSwallowedError();
  });

  it("getCostByFeature runs", async () => {
    expect(Array.isArray(await M.getCostByFeature(7))).toBe(true);
    expectNoSwallowedError();
  });

  it("getModelMix runs", async () => {
    expect(Array.isArray(await M.getModelMix(7))).toBe(true);
    expectNoSwallowedError();
  });

  it("getLatencyByRoute runs (db.execute result shape)", async () => {
    expect(Array.isArray(await M.getLatencyByRoute(7))).toBe(true);
    expectNoSwallowedError();
  });

  it("getLatencyByModel runs (db.execute result shape)", async () => {
    expect(Array.isArray(await M.getLatencyByModel(7))).toBe(true);
    expectNoSwallowedError();
  });

  it("getFallbackRate runs", async () => {
    const r = await M.getFallbackRate(7);
    expect(r).toHaveProperty("percentage");
    expectNoSwallowedError();
  });

  it("getFeedbackByVersion runs (ORDER BY alias)", async () => {
    expect(Array.isArray(await M.getFeedbackByVersion(7))).toBe(true);
    expectNoSwallowedError();
  });
});
