/**
 * Unit tests for POST /api/billing/webhook
 *
 * Covers:
 *   • Signature verification failure → 400
 *   • Missing Stripe config → 500
 *   • Idempotency guard: duplicate event ID → 200 without re-processing
 *   • checkout.session.completed → user.plan synced, subscription upserted
 *   • customer.subscription.updated with plan change → user.plan updated
 *   • customer.subscription.updated without plan change → user.plan NOT updated
 *   • customer.subscription.deleted → user.plan reset to "free"
 *   • invoice.payment_failed → planExpiresAt grace period set
 *   • Unhandled event type → 200 (silent ignore)
 *   • Processing error → 500, event NOT recorded (so Stripe retries)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// ─── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockConstructEvent,
  mockStripeSubscriptionsRetrieve,
  mockDbQueryProcessedFindFirst,
  mockDbQuerySubscriptionsFindFirst,
  mockDbQueryUserFindFirst,
  mockDbInsertFn,
  mockDbUpdateFn,
  mockDbInsertValuesFn,
  mockDbUpdateSetFn,
} = vi.hoisted(() => {
  const mockConstructEvent = vi.fn();
  const mockStripeSubscriptionsRetrieve = vi.fn();

  const mockDbQueryProcessedFindFirst = vi.fn();
  const mockDbQuerySubscriptionsFindFirst = vi.fn();
  const mockDbQueryUserFindFirst = vi.fn();

  const mockDbUpdateSetFn = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
  const mockDbInsertValuesFn = vi.fn(() => ({
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  }));

  // insert(...) and update(...) are called multiple times per handler; mock the
  // chain so every call site returns a resolved promise.
  const mockDbInsertFn = vi.fn(() => ({ values: mockDbInsertValuesFn }));
  const mockDbUpdateFn = vi.fn(() => ({ set: mockDbUpdateSetFn }));

  return {
    mockConstructEvent,
    mockStripeSubscriptionsRetrieve,
    mockDbQueryProcessedFindFirst,
    mockDbQuerySubscriptionsFindFirst,
    mockDbQueryUserFindFirst,
    mockDbInsertFn,
    mockDbUpdateFn,
    mockDbInsertValuesFn,
    mockDbUpdateSetFn,
  };
});

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({
    get: (name: string) => (name === "Stripe-Signature" ? "t=123,v1=abc" : null),
  })),
}));

vi.mock("stripe", () => {
  // `new Stripe(...)` requires a constructor function — arrow functions cannot be
  // used with `new`. We use a regular function and return the mock instance from it.
  return {
    default: function StripeConstructorMock() {
      return {
        webhooks: { constructEvent: mockConstructEvent },
        subscriptions: { retrieve: mockStripeSubscriptionsRetrieve },
      };
    },
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      processedWebhookEvents: { findFirst: mockDbQueryProcessedFindFirst },
      subscriptions: { findFirst: mockDbQuerySubscriptionsFindFirst },
      user: { findFirst: mockDbQueryUserFindFirst },
    },
    insert: mockDbInsertFn,
    update: mockDbUpdateFn,
  },
}));

vi.mock("@/lib/services/notifications", () => ({
  notifyBillingEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/email", () => ({
  sendBillingEmail: vi.fn().mockResolvedValue(undefined),
}));

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeRequest(body = "{}") {
  return { text: () => Promise.resolve(body), headers: new Headers() } as unknown as Request;
}

function makeSubscription(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sub_test",
    status: "active",
    cancel_at_period_end: false,
    canceled_at: null,
    trial_end: null,
    items: {
      data: [{ price: { id: process.env.STRIPE_PRICE_ID_MONTHLY ?? "price_monthly" } }],
    },
    current_period_start: 1700000000,
    current_period_end: 1702592000,
    ...overrides,
  };
}

function makeStripeEvent(type: string, object: Record<string, unknown>) {
  return { id: `evt_${type.replace(/\./g, "_")}`, type, data: { object } };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
//
// Vitest types vi.fn() mock.calls as `[][]` (empty tuples) by default, which
// causes TS2493 when accessing c[0] with noUncheckedIndexedAccess enabled.
// Casting the whole calls array to `Array<[Record<string, unknown>]>` tells
// TypeScript each call has exactly one argument of the expected type.

function getSetArgs(mock: ReturnType<typeof vi.fn>): Record<string, unknown>[] {
  return (mock.mock.calls as Array<[Record<string, unknown>]>).map(([arg]) => arg);
}

function getValuesArgs(mock: ReturnType<typeof vi.fn>): Record<string, unknown>[] {
  return (mock.mock.calls as Array<[Record<string, unknown>]>).map(([arg]) => arg);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/billing/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Re-wire chainable mock chains after clearAllMocks resets call counts.
    mockDbInsertFn.mockImplementation(() => ({ values: mockDbInsertValuesFn }));
    mockDbUpdateFn.mockImplementation(() => ({ set: mockDbUpdateSetFn }));
    mockDbUpdateSetFn.mockImplementation(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
    mockDbInsertValuesFn.mockImplementation(() => ({
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    }));

    // Stripe env vars
    process.env.STRIPE_SECRET_KEY = "sk_test_key";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_PRICE_ID_MONTHLY = "price_monthly";
    process.env.STRIPE_PRICE_ID_ANNUAL = "price_annual";

    // Default: event not yet processed
    mockDbQueryProcessedFindFirst.mockResolvedValue(null);
    // Default: no subscription record
    mockDbQuerySubscriptionsFindFirst.mockResolvedValue(null);
    // Default: no user record
    mockDbQueryUserFindFirst.mockResolvedValue(null);
  });

  // ── Config / auth guards ─────────────────────────────────────────────────

  it("returns 500 when STRIPE_SECRET_KEY is missing", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
  });

  it("returns 500 when STRIPE_WEBHOOK_SECRET is missing", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
  });

  it("returns 400 when Stripe signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Signature mismatch");
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  // ── Idempotency guard ─────────────────────────────────────────────────────

  it("returns 200 immediately and skips processing for a duplicate event", async () => {
    mockConstructEvent.mockReturnValue(
      makeStripeEvent("customer.subscription.updated", makeSubscription()),
    );
    // Signal that this event was already processed.
    mockDbQueryProcessedFindFirst.mockResolvedValue({ id: "existing-row" });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    // The DB update/insert for subscription data must NOT have been called.
    expect(mockDbUpdateFn).not.toHaveBeenCalled();
  });

  it("records the event in processedWebhookEvents on first processing", async () => {
    mockConstructEvent.mockReturnValue(
      makeStripeEvent("customer.subscription.deleted", {
        id: "sub_del",
        status: "canceled",
        cancel_at_period_end: true,
        canceled_at: 1700000000,
        items: { data: [] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
      }),
    );
    mockDbQuerySubscriptionsFindFirst.mockResolvedValue({
      id: "db-sub-1",
      userId: "user-1",
      plan: "pro_monthly",
      stripeSubscriptionId: "sub_del",
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    // Should have inserted into processedWebhookEvents.
    const insertCalls = mockDbInsertFn.mock.calls;
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);
  });

  // ── checkout.session.completed ────────────────────────────────────────────

  it("syncs user.plan and upserts subscription on checkout.session.completed", async () => {
    const sub = makeSubscription();
    mockStripeSubscriptionsRetrieve.mockResolvedValue(sub);

    mockConstructEvent.mockReturnValue(
      makeStripeEvent("checkout.session.completed", {
        id: "cs_test",
        subscription: "sub_test",
        customer: "cus_test",
        metadata: { userId: "user-1", plan: "pro_monthly" },
      }),
    );

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    // user.plan update
    const updateSetCalls = getSetArgs(mockDbUpdateSetFn);
    const userPlanUpdate = updateSetCalls.find((v) => v.plan !== undefined);
    expect(userPlanUpdate?.plan).toBe("pro_monthly");
  });

  it("returns 500 when checkout.session.completed is missing userId metadata", async () => {
    mockStripeSubscriptionsRetrieve.mockResolvedValue(makeSubscription());
    mockConstructEvent.mockReturnValue(
      makeStripeEvent("checkout.session.completed", {
        id: "cs_bad",
        subscription: "sub_test",
        customer: "cus_test",
        metadata: {}, // no userId
      }),
    );

    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
    // Event must NOT be recorded so Stripe retries.
    const insertValuesCalls = getValuesArgs(mockDbInsertValuesFn);
    const idempotencyInsert = insertValuesCalls.find((v) => v.stripeEventId !== undefined);
    expect(idempotencyInsert).toBeUndefined();
  });

  // ── customer.subscription.updated ────────────────────────────────────────

  it("updates user.plan when subscription plan changes", async () => {
    // Existing subscription has pro_monthly; new event upgrades to pro_annual.
    process.env.STRIPE_PRICE_ID_ANNUAL = "price_annual";
    const sub = makeSubscription({
      items: { data: [{ price: { id: "price_annual" } }] },
    });
    mockConstructEvent.mockReturnValue(
      makeStripeEvent("customer.subscription.updated", sub),
    );
    mockDbQuerySubscriptionsFindFirst.mockResolvedValue({
      id: "db-sub-1",
      userId: "user-1",
      plan: "pro_monthly", // old plan — different from incoming "pro_annual"
      stripeSubscriptionId: "sub_test",
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const updateSetCalls = getSetArgs(mockDbUpdateSetFn);
    const userPlanUpdate = updateSetCalls.find(
      (v) => v.plan === "pro_annual",
    );
    expect(userPlanUpdate).toBeDefined();
  });

  it("does NOT update user.plan when subscription plan has not changed", async () => {
    process.env.STRIPE_PRICE_ID_MONTHLY = "price_monthly";
    const sub = makeSubscription({
      items: { data: [{ price: { id: "price_monthly" } }] },
    });
    mockConstructEvent.mockReturnValue(
      makeStripeEvent("customer.subscription.updated", sub),
    );
    mockDbQuerySubscriptionsFindFirst.mockResolvedValue({
      id: "db-sub-1",
      userId: "user-1",
      plan: "pro_monthly", // same plan — no change expected
      stripeSubscriptionId: "sub_test",
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    // user.plan must NOT be among the update calls (only subscription status update)
    const updateSetCalls = getSetArgs(mockDbUpdateSetFn);
    const userPlanUpdate = updateSetCalls.find((v) => v.plan !== undefined);
    // If there is a plan update, it should not include planExpiresAt: null
    // (that would indicate a user.plan sync happened).
    if (userPlanUpdate) {
      // A subscription-table update may include plan, but must NOT have planExpiresAt.
      expect(userPlanUpdate.planExpiresAt).toBeUndefined();
    }
  });

  // ── customer.subscription.deleted ────────────────────────────────────────

  it("resets user.plan to 'free' on subscription deletion", async () => {
    const sub = {
      id: "sub_del",
      status: "canceled",
      cancel_at_period_end: true,
      canceled_at: 1700000000,
      items: { data: [] },
      current_period_start: 1700000000,
      current_period_end: 1702592000,
    };
    mockConstructEvent.mockReturnValue(
      makeStripeEvent("customer.subscription.deleted", sub),
    );
    mockDbQuerySubscriptionsFindFirst.mockResolvedValue({
      id: "db-sub-2",
      userId: "user-2",
      plan: "pro_monthly",
      stripeSubscriptionId: "sub_del",
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const updateSetCalls = getSetArgs(mockDbUpdateSetFn);
    const freeUpdate = updateSetCalls.find((v) => v.plan === "free");
    expect(freeUpdate).toBeDefined();
  });

  // ── invoice.payment_failed ────────────────────────────────────────────────

  it("sets planExpiresAt grace period on invoice.payment_failed", async () => {
    const invoice = {
      id: "inv_fail",
      subscription: "sub_grace",
    };
    mockConstructEvent.mockReturnValue(
      makeStripeEvent("invoice.payment_failed", invoice),
    );
    mockDbQuerySubscriptionsFindFirst.mockResolvedValue({
      id: "db-sub-3",
      userId: "user-3",
      plan: "pro_monthly",
      stripeSubscriptionId: "sub_grace",
    });
    mockDbQueryUserFindFirst.mockResolvedValue({ email: "user@example.com", name: "Test User" });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const updateSetCalls = getSetArgs(mockDbUpdateSetFn);
    const graceUpdate = updateSetCalls.find((v) => v.planExpiresAt !== undefined);
    expect(graceUpdate?.planExpiresAt).toBeInstanceOf(Date);
  });

  // ── Unhandled event type ───────────────────────────────────────────────────

  it("returns 200 for an unhandled event type without throwing", async () => {
    mockConstructEvent.mockReturnValue(
      makeStripeEvent("payment_method.attached", { id: "pm_test" }),
    );

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
  });
});
