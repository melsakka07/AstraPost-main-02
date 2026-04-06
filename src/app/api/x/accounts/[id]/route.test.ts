/**
 * Unit tests for DELETE /api/x/accounts/[id]
 *
 * Covers:
 *   • Unauthorized request → 401
 *   • Cannot delete last remaining account → 400
 *   • Deleting default account promotes next account to default
 *   • Scheduled posts moved to cancelled on account deletion
 *   • Paused posts moved to cancelled on account deletion
 *   • Account not found → 404
 *   • Successful deletion → 200
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "./route";

// ─── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockAuthApiGetSession,
  mockDbTransactionFn,
  mockDbQueryXAccountsFindFirst,
  mockDbSelectFn,
  mockDbUpdateFn,
  mockDbDeleteFn,
  mockDbUpdateSetFn,
  mockDbDeleteWhereFn,
  mockDbSelectFromFn,
  mockDbSelectWhereFn,
} = vi.hoisted(() => {
  const mockAuthApiGetSession = vi.fn();

  const mockDbQueryXAccountsFindFirst = vi.fn();
  const mockDbUpdateSetFn = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
  const mockDbDeleteWhereFn = vi.fn().mockResolvedValue(undefined);
  const mockDbSelectWhereFn = vi.fn().mockResolvedValue([{ totalCount: 1 }]);

  const mockDbUpdateFn = vi.fn(() => ({ set: mockDbUpdateSetFn }));
  const mockDbDeleteFn = vi.fn(() => ({ where: mockDbDeleteWhereFn }));
  const mockDbSelectFromFn = vi.fn(() => ({ where: mockDbSelectWhereFn }));
  const mockDbSelectFn = vi.fn(() => ({ from: mockDbSelectFromFn }));

  // transaction(callback) — executes the callback immediately with a fake tx
  // that exposes the same query/update/delete mocks, simulating a real DB transaction.
  const mockDbTransactionFn = vi.fn(async (callback: (tx: unknown) => Promise<void>) => {
    await callback({
      query: {
        xAccounts: { findFirst: mockDbQueryXAccountsFindFirst },
      },
      select: mockDbSelectFn,
      update: mockDbUpdateFn,
      delete: mockDbDeleteFn,
    });
  });

  return {
    mockAuthApiGetSession,
    mockDbTransactionFn,
    mockDbQueryXAccountsFindFirst,
    mockDbSelectFn,
    mockDbUpdateFn,
    mockDbDeleteFn,
    mockDbUpdateSetFn,
    mockDbDeleteWhereFn,
    mockDbSelectFromFn,
    mockDbSelectWhereFn,
  };
});

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockAuthApiGetSession,
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    transaction: mockDbTransactionFn,
  },
}));

vi.mock("@/lib/schema", () => ({
  xAccounts: "xAccounts",
  posts: "posts",
}));

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeRequest(paramsId: string): Request {
  return {
    url: `http://localhost:3000/api/x/accounts/${paramsId}`,
  } as unknown as Request;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DELETE /api/x/accounts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Re-wire chainable mock chains after clearAllMocks resets call counts.
    mockDbUpdateFn.mockImplementation(() => ({ set: mockDbUpdateSetFn }));
    mockDbDeleteFn.mockImplementation(() => ({ where: mockDbDeleteWhereFn }));
    mockDbUpdateSetFn.mockImplementation(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
    mockDbDeleteWhereFn.mockResolvedValue(undefined);
    mockDbSelectWhereFn.mockResolvedValue([{ totalCount: 2 }]);
    mockDbSelectFn.mockImplementation(() => ({ from: mockDbSelectFromFn }));
    mockDbSelectFromFn.mockImplementation(() => ({ where: mockDbSelectWhereFn }));

    // Default: authenticated user
    mockAuthApiGetSession.mockResolvedValue({
      user: { id: "user-1", name: "Test User", email: "test@example.com" },
    });

    // Default: account exists and is not default
    mockDbQueryXAccountsFindFirst.mockResolvedValue({
      id: "account-1",
      isDefault: false,
    });
  });

  // ── Auth guard ───────────────────────────────────────────────────────────────

  it("returns 401 when session is missing", async () => {
    mockAuthApiGetSession.mockResolvedValue(null);

    const res = await DELETE(makeRequest("account-1"), {
      params: Promise.resolve({ id: "account-1" }),
    });

    expect(res.status).toBe(401);
  });

  // ── Last account guard ───────────────────────────────────────────────────────

  it("returns 400 when attempting to delete the last remaining account", async () => {
    // Mock total count = 1 (last account)
    mockDbSelectWhereFn.mockResolvedValue([{ totalCount: 1 }]);
    mockDbQueryXAccountsFindFirst.mockResolvedValue({
      id: "account-1",
      isDefault: true,
    });

    const res = await DELETE(makeRequest("account-1"), {
      params: Promise.resolve({ id: "account-1" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Cannot remove your last connected X account");
  });

  // ── Default account promotion ─────────────────────────────────────────────────

  it("promotes next active account to default when deleting default account", async () => {
    // Mock: deleting the default account
    mockDbQueryXAccountsFindFirst
      .mockResolvedValueOnce({
        id: "account-default",
        isDefault: true,
      })
      // Mock: find next active account to promote
      .mockResolvedValueOnce({
        id: "account-next",
      });

    const res = await DELETE(makeRequest("account-default"), {
      params: Promise.resolve({ id: "account-default" }),
    });

    expect(res.status).toBe(200);

    // Verify update was called to promote the next account
    const updateCalls = mockDbUpdateSetFn.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const defaultPromotion = updateCalls.find(([args]) => args.isDefault === true);

    expect(defaultPromotion).toBeDefined();
  });

  it("promotes oldest account to default when no active accounts exist", async () => {
    // Mock: deleting the default account
    mockDbQueryXAccountsFindFirst
      .mockResolvedValueOnce({
        id: "account-default",
        isDefault: true,
      })
      // Mock: no active account found
      .mockResolvedValueOnce(null)
      // Mock: oldest account found
      .mockResolvedValueOnce({
        id: "account-oldest",
      });

    const res = await DELETE(makeRequest("account-default"), {
      params: Promise.resolve({ id: "account-default" }),
    });

    expect(res.status).toBe(200);

    // Verify update was called to promote the oldest account
    const updateCalls = mockDbUpdateSetFn.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const defaultPromotion = updateCalls.find(([args]) => args.isDefault === true);

    expect(defaultPromotion).toBeDefined();
  });

  // ── Scheduled posts cancellation ─────────────────────────────────────────────

  it("cancels scheduled posts when account is deleted", async () => {
    const res = await DELETE(makeRequest("account-1"), {
      params: Promise.resolve({ id: "account-1" }),
    });

    expect(res.status).toBe(200);

    // Verify update was called for scheduled posts
    const updateCalls = mockDbUpdateSetFn.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const scheduledUpdate = updateCalls.find(([args]) => args.status === "cancelled");

    expect(scheduledUpdate).toBeDefined();
  });

  it("cancels paused posts when account is deleted", async () => {
    const res = await DELETE(makeRequest("account-1"), {
      params: Promise.resolve({ id: "account-1" }),
    });

    expect(res.status).toBe(200);

    // Verify update was called for paused posts
    // Should have at least 2 calls to update: one for scheduled, one for paused
    const updateCalls = mockDbUpdateSetFn.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const cancelledUpdates = updateCalls.filter(([args]) => args.status === "cancelled");

    expect(cancelledUpdates.length).toBeGreaterThanOrEqual(2);
  });

  // ── Account not found ─────────────────────────────────────────────────────────

  it("returns 404 when account does not exist", async () => {
    mockDbQueryXAccountsFindFirst.mockResolvedValue(null);

    const res = await DELETE(makeRequest("nonexistent"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("X account not found");
  });

  it("returns 404 when account belongs to different user", async () => {
    // Account exists but for different user (simulated by returning null in findFirst
    // due to userId mismatch in the WHERE clause)
    mockDbQueryXAccountsFindFirst.mockResolvedValue(null);

    const res = await DELETE(makeRequest("account-other-user"), {
      params: Promise.resolve({ id: "account-other-user" }),
    });

    expect(res.status).toBe(404);
  });

  // ── Successful deletion ──────────────────────────────────────────────────────

  it("successfully deletes account with 200 response", async () => {
    const res = await DELETE(makeRequest("account-1"), {
      params: Promise.resolve({ id: "account-1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("deletes the account after all validations and updates", async () => {
    const res = await DELETE(makeRequest("account-1"), {
      params: Promise.resolve({ id: "account-1" }),
    });

    expect(res.status).toBe(200);
    expect(mockDbDeleteFn).toHaveBeenCalled();
  });
});
