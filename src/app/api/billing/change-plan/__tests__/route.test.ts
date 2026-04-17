import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

const {
  mockDbQuerySubscriptionsFindFirst,
  mockStripeSubscriptionsRetrieve,
  mockStripeSubscriptionsUpdate,
  mockDbUpdateFn,
} = vi.hoisted(() => {
  const mockDbQuerySubscriptionsFindFirst = vi.fn();
  const mockStripeSubscriptionsRetrieve = vi.fn();
  const mockStripeSubscriptionsUpdate = vi.fn();
  const mockDbUpdateFn = vi.fn(() => ({
    set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  }));

  return {
    mockDbQuerySubscriptionsFindFirst,
    mockStripeSubscriptionsRetrieve,
    mockStripeSubscriptionsUpdate,
    mockDbUpdateFn,
  };
});

vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({
    get: vi.fn(() => "127.0.0.1"),
  })),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      subscriptions: { findFirst: mockDbQuerySubscriptionsFindFirst },
    },
    update: mockDbUpdateFn,
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: mockStripeSubscriptionsRetrieve,
      update: mockStripeSubscriptionsUpdate,
    },
  },
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkIpRateLimit: vi.fn().mockResolvedValue({ limited: false }),
}));

describe("POST /api/billing/change-plan", async () => {
  const { auth } = await import("@/lib/auth");
  // TypeScript hack for vi.mock override:
  const mockedAuth = auth as any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.STRIPE_PRICE_ID_MONTHLY = "price_pro_monthly";
    process.env.STRIPE_PRICE_ID_ANNUAL = "price_pro_annual";

    // Default auth session
    mockedAuth.api.getSession.mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
    });

    mockDbQuerySubscriptionsFindFirst.mockResolvedValue({
      status: "active",
      stripeSubscriptionId: "sub_123",
    });
    mockStripeSubscriptionsRetrieve.mockResolvedValue({
      id: "sub_123",
      items: { data: [{ id: "si_123" }] },
      current_period_end: 1700000000,
    });
  });

  it("rejects unauthenticated requests", async () => {
    mockedAuth.api.getSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/billing/change-plan", {
      method: "POST",
      body: JSON.stringify({ plan: "pro_monthly" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects if no active subscription exists", async () => {
    mockDbQuerySubscriptionsFindFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/billing/change-plan", {
      method: "POST",
      body: JSON.stringify({ plan: "pro_monthly" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("downgrades to free and schedules cancel_at_period_end", async () => {
    mockStripeSubscriptionsUpdate.mockResolvedValue({ id: "sub_123" });

    const req = new Request("http://localhost/api/billing/change-plan", {
      method: "POST",
      body: JSON.stringify({ plan: "free" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.action).toBe("cancel_scheduled");
    expect(mockStripeSubscriptionsUpdate).toHaveBeenCalledWith("sub_123", {
      cancel_at_period_end: true,
    });
  });

  it("upgrades plan and updates Stripe subscription", async () => {
    mockStripeSubscriptionsUpdate.mockResolvedValue({ id: "sub_123" });

    const req = new Request("http://localhost/api/billing/change-plan", {
      method: "POST",
      body: JSON.stringify({ plan: "pro_annual" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.action).toBe("plan_changed");
    expect(mockStripeSubscriptionsUpdate).toHaveBeenCalledWith(
      "sub_123",
      expect.objectContaining({
        cancel_at_period_end: false,
        proration_behavior: "create_prorations",
        items: expect.arrayContaining([expect.objectContaining({ id: "si_123" })]),
      })
    );
  });

  it("handles Stripe API failure gracefully", async () => {
    mockStripeSubscriptionsUpdate.mockRejectedValue(new Error("Stripe Error"));

    const req = new Request("http://localhost/api/billing/change-plan", {
      method: "POST",
      body: JSON.stringify({ plan: "pro_annual" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();

    expect(data.error).toMatch(/Failed to change plan/);
  });
});
