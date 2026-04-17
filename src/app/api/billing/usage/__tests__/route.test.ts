import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const { mockDbQueryUserFindFirst, mockDbSelectFn } = vi.hoisted(() => {
  const mockDbQueryUserFindFirst = vi.fn();

  const mockDbSelectFn = vi.fn(() => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      then: (resolve: any) => resolve([{ count: 10 }]),
    };
    return chain;
  });

  return {
    mockDbQueryUserFindFirst,
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
    },
    select: mockDbSelectFn,
  },
}));

describe("GET /api/billing/usage", async () => {
  const { auth } = await import("@/lib/auth");
  const mockedAuth = auth as any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockedAuth.api.getSession.mockResolvedValue({
      user: { id: "user-123" },
    });
  });

  it("returns 401 if unauthenticated", async () => {
    mockedAuth.api.getSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns correct quota usage for each plan", async () => {
    mockDbQueryUserFindFirst.mockResolvedValue({ plan: "pro_monthly" });

    // Mocks 4 parallel db.select queries
    mockDbSelectFn.mockImplementation(() => {
      const chain: any = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        then: (resolve: any) => resolve([{ count: 5 }]),
      };
      return chain;
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.plan).toBe("pro_monthly");
    expect(data.usage.posts).toBe(5);
    expect(data.usage.accounts).toBe(5);
    expect(data.usage.ai).toBe(5);
    expect(data.usage.aiImages).toBe(5);
  });

  it("returns correct limits for free plan", async () => {
    mockDbQueryUserFindFirst.mockResolvedValue({ plan: "free" });

    mockDbSelectFn.mockImplementation(() => {
      const chain: any = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        then: (resolve: any) => resolve([{ count: 0 }]),
      };
      return chain;
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.plan).toBe("free");
    expect(data.limits.postsPerMonth).toBe(20);
    expect(data.limits.maxXAccounts).toBe(1);
    expect(data.limits.aiGenerationsPerMonth).toBe(20);
  });
});
