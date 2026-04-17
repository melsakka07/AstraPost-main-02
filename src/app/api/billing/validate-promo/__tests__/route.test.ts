import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

const { mockDbSelectFn } = vi.hoisted(() => {
  const mockDbSelectFn = vi.fn(() => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      then: (resolve: any) => resolve([]),
    };
    return chain;
  });

  return { mockDbSelectFn };
});

vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({
    get: vi.fn(() => "127.0.0.1"),
  })),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockDbSelectFn,
  },
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkIpRateLimit: vi.fn().mockResolvedValue({ limited: false }),
  createIpRateLimitResponse: vi.fn((retryAfter) => {
    // eslint-disable-next-line no-restricted-syntax
    return new Response(JSON.stringify({ error: "Rate limit", retryAfter }), { status: 429 });
  }),
}));

describe("POST /api/billing/validate-promo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing code", async () => {
    const req = new Request("http://localhost/api/billing/validate-promo", {
      method: "POST",
      headers: { "x-forwarded-for": "127.0.0.1" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 for invalid code", async () => {
    mockDbSelectFn.mockImplementationOnce(() => {
      const chain: any = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        then: (resolve: any) => resolve([]),
      };
      return chain;
    });

    const req = new Request("http://localhost/api/billing/validate-promo", {
      method: "POST",
      headers: { "x-forwarded-for": "127.0.0.1" },
      body: JSON.stringify({ code: "INVALID" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns invalid reason for expired code", async () => {
    mockDbSelectFn.mockImplementationOnce(() => {
      const chain: any = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        then: (resolve: any) =>
          resolve([
            {
              code: "EXPIRED",
              isActive: true,
              validTo: new Date(Date.now() - 10000), // Past
              applicablePlans: [],
            },
          ]),
      };
      return chain;
    });

    const req = new Request("http://localhost/api/billing/validate-promo", {
      method: "POST",
      headers: { "x-forwarded-for": "127.0.0.1" },
      body: JSON.stringify({ code: "EXPIRED" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.reason).toMatch(/expired/);
  });

  it("valid code returns discount info", async () => {
    mockDbSelectFn.mockImplementationOnce(() => {
      const chain: any = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        then: (resolve: any) =>
          resolve([
            {
              code: "VALID10",
              isActive: true,
              discountType: "percentage",
              discountValue: 10,
              stripeCouponId: "coupon_123",
              description: "10% off",
              applicablePlans: [],
            },
          ]),
      };
      return chain;
    });

    const req = new Request("http://localhost/api/billing/validate-promo", {
      method: "POST",
      headers: { "x-forwarded-for": "127.0.0.1" },
      body: JSON.stringify({ code: "VALID10" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.valid).toBe(true);
    expect(data.code).toBe("VALID10");
    expect(data.discountValue).toBe(10);
  });
});
