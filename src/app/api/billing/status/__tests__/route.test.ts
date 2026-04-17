import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const {
  mockDbQueryUserFindFirst,
  mockDbSelectFn,
  mockStripeSubscriptionsRetrieve,
  mockRedisGet,
  mockRedisSetex,
  mockDbTransactionFn,
} = vi.hoisted(() => {
  const mockDbQueryUserFindFirst = vi.fn();

  const mockDbSelectFn = vi.fn(() => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      then: (resolve: any) => resolve([]),
    };
    return chain;
  });

  const mockStripeSubscriptionsRetrieve = vi.fn();
  const mockRedisGet = vi.fn();
  const mockRedisSetex = vi.fn();

  const mockDbTransactionFn = vi.fn(async (cb: any) => {
    return cb({
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      })),
      insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    });
  });

  return {
    mockDbQueryUserFindFirst,
    mockDbSelectFn,
    mockStripeSubscriptionsRetrieve,
    mockRedisGet,
    mockRedisSetex,
    mockDbTransactionFn,
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
    },
    select: mockDbSelectFn,
    transaction: mockDbTransactionFn,
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: { retrieve: mockStripeSubscriptionsRetrieve },
  },
}));

vi.mock("@/lib/billing-redis", () => ({
  getBillingRedis: vi.fn(() => ({
    get: mockRedisGet,
    setex: mockRedisSetex,
  })),
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkIpRateLimit: vi.fn().mockResolvedValue({ limited: false }),
  createIpRateLimitResponse: vi.fn((retryAfter) => {
    // eslint-disable-next-line no-restricted-syntax
    return new Response(JSON.stringify({ error: "Rate limit", retryAfter }), { status: 429 });
  }),
}));

describe("GET /api/billing/status", async () => {
  const { auth } = await import("@/lib/auth");
  const mockedAuth = auth as any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockedAuth.api.getSession.mockResolvedValue({
      user: { id: "user-123" },
    });
  });

  it("returns correct plan for free user", async () => {
    mockDbQueryUserFindFirst.mockResolvedValue({
      plan: "free",
      stripeCustomerId: null,
      trialEndsAt: null,
      planExpiresAt: null,
    });

    // Simulate no latest subscription
    mockDbSelectFn.mockImplementationOnce(() => {
      const chain: any = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        then: (resolve: any) => resolve([]),
      };
      return chain;
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.plan).toBe("free");
    expect(data.status).toBe("free");
  });

  it("returns trial info for trial user", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    mockDbQueryUserFindFirst.mockResolvedValue({
      plan: "free",
      stripeCustomerId: null,
      trialEndsAt: futureDate,
      planExpiresAt: null,
    });

    mockDbSelectFn.mockImplementationOnce(() => {
      const chain: any = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        then: (resolve: any) => resolve([]),
      };
      return chain;
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.plan).toBe("free");
    expect(data.status).toBe("free");
    expect(data.trialEndsAt).toBe(futureDate.toISOString());
  });

  it("returns subscription data for paid user", async () => {
    mockDbQueryUserFindFirst.mockResolvedValue({
      plan: "pro_monthly",
      stripeCustomerId: "cus_123",
      trialEndsAt: null,
      planExpiresAt: null,
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    mockDbSelectFn.mockImplementationOnce(() => {
      const chain: any = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        then: (resolve: any) =>
          resolve([
            {
              stripeSubscriptionId: "sub_123",
              status: "active",
              currentPeriodEnd: futureDate,
              cancelAtPeriodEnd: false,
              plan: "pro_monthly",
            },
          ]),
      };
      return chain;
    });

    mockRedisGet.mockResolvedValue("1"); // Redis cache hit

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.plan).toBe("pro_monthly");
    expect(data.status).toBe("active");
    expect(data.currentPeriodEnd).toBe(futureDate.toISOString());
    expect(mockStripeSubscriptionsRetrieve).not.toHaveBeenCalled();
  });

  it("Redis cache hit returns cached data without DB query", async () => {
    mockDbQueryUserFindFirst.mockResolvedValue({
      plan: "pro_monthly",
      stripeCustomerId: "cus_123",
    });

    mockDbSelectFn.mockImplementationOnce(() => {
      const chain: any = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        then: (resolve: any) =>
          resolve([
            {
              stripeSubscriptionId: "sub_123",
              status: "active",
              plan: "pro_monthly",
            },
          ]),
      };
      return chain;
    });

    mockRedisGet.mockResolvedValue("1");

    await GET();
    expect(mockStripeSubscriptionsRetrieve).not.toHaveBeenCalled();
  });
});
