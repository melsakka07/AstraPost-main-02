import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

// Hoist mocks to the top
const {
  mockDbQueryUserFindFirst,
  mockDbQuerySubscriptionsFindFirst,
  mockStripeCustomersCreate,
  mockStripeCheckoutSessionsCreate,
  mockDbUpdateFn,
  mockDbSelectFn,
} = vi.hoisted(() => {
  const mockDbQueryUserFindFirst = vi.fn();
  const mockDbQuerySubscriptionsFindFirst = vi.fn();
  const mockStripeCustomersCreate = vi.fn();
  const mockStripeCheckoutSessionsCreate = vi.fn();
  const mockDbUpdateFn = vi.fn(() => ({
    set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  }));

  // For the referral credits check
  const mockDbSelectFn = vi.fn(() => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      then: (resolve: any) => resolve([{ value: 0 }]),
    };
    return chain;
  });

  return {
    mockDbQueryUserFindFirst,
    mockDbQuerySubscriptionsFindFirst,
    mockStripeCustomersCreate,
    mockStripeCheckoutSessionsCreate,
    mockDbUpdateFn,
    mockDbSelectFn,
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
      user: { findFirst: mockDbQueryUserFindFirst },
      subscriptions: { findFirst: mockDbQuerySubscriptionsFindFirst },
    },
    update: mockDbUpdateFn,
    select: mockDbSelectFn,
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: { create: mockStripeCustomersCreate },
    checkout: { sessions: { create: mockStripeCheckoutSessionsCreate } },
  },
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkIpRateLimit: vi.fn().mockResolvedValue({ limited: false }),
}));

describe("POST /api/billing/checkout", async () => {
  const { auth } = await import("@/lib/auth");
  const mockedAuth = auth as any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.STRIPE_PRICE_ID_MONTHLY = "price_pro_monthly";
    process.env.STRIPE_PRICE_ID_ANNUAL = "price_pro_annual";

    // Default auth session
    mockedAuth.api.getSession.mockResolvedValue({
      user: { id: "user-123", email: "test@example.com", name: "Test User" },
    });

    // Default db responses
    mockDbQueryUserFindFirst.mockResolvedValue({
      stripeCustomerId: "cus_123",
      plan: "free",
      trialEndsAt: null,
    });
    mockDbQuerySubscriptionsFindFirst.mockResolvedValue(null);
    mockStripeCheckoutSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/test" });
  });

  it("returns 401 if unauthenticated", async () => {
    mockedAuth.api.getSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "pro_monthly" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 409 if already on an active plan", async () => {
    mockDbQuerySubscriptionsFindFirst.mockResolvedValue({ status: "active" });

    const req = new Request("http://localhost/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "pro_monthly" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/active subscription already exists/);
  });

  it("creates a checkout session for free to pro upgrade", async () => {
    const req = new Request("http://localhost/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "pro_monthly" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.url).toBe("https://checkout.stripe.com/test");
    expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_123",
        mode: "subscription",
      })
    );
  });

  it("creates customer if one does not exist", async () => {
    mockDbQueryUserFindFirst.mockResolvedValueOnce({
      stripeCustomerId: null,
      plan: "free",
      trialEndsAt: null,
    }); // initial check
    mockDbQueryUserFindFirst.mockResolvedValueOnce({ stripeCustomerId: null }); // race condition check
    mockStripeCustomersCreate.mockResolvedValue({ id: "cus_new" });

    const req = new Request("http://localhost/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "pro_monthly" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockStripeCustomersCreate).toHaveBeenCalledWith({
      email: "test@example.com",
      name: "Test User",
      metadata: { userId: "user-123" },
    });
    expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_new" })
    );
  });
});
