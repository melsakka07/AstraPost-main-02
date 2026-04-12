/**
 * Unit tests for POST /api/ai/agentic/[id]/approve
 *
 * Covers:
 *   • post_now action → 200, transaction called
 *   • schedule action with scheduledAt → 200, transaction called
 *   • save_draft action → 200, transaction called
 *   • unauthenticated → 401
 *   • ownership failure (post not found) → 404
 *   • wrong status → 400
 *   • schedule without scheduledAt → 400
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { auth } from "@/lib/auth";
import { POST } from "./route";

// ─── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockFindFirst, mockTransaction } = vi.hoisted(() => {
  const mockTxInsertValues = vi.fn().mockResolvedValue(undefined);
  const mockTxUpdateSet = vi.fn(() => ({
    where: vi.fn().mockResolvedValue(undefined),
  }));
  const mockTxInsert = vi.fn(() => ({ values: mockTxInsertValues }));
  const mockTxUpdate = vi.fn(() => ({ set: mockTxUpdateSet }));

  const mockTransaction = vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
    await fn({ insert: mockTxInsert, update: mockTxUpdate });
  });

  const mockFindFirst = vi.fn();

  return { mockFindFirst, mockTransaction };
});

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("nanoid", () => ({ nanoid: vi.fn(() => "generated-id") }));

vi.mock("@/lib/correlation", () => ({
  getCorrelationId: vi.fn(() => "corr-1"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: { agenticPosts: { findFirst: mockFindFirst } },
    transaction: mockTransaction,
  },
}));

vi.mock("@/lib/queue/client", () => ({
  scheduleQueue: { add: vi.fn().mockResolvedValue({ id: "job-1" }) },
  SCHEDULE_JOB_OPTIONS: { attempts: 5 },
}));

// ─── Test fixtures ─────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-1" } };

const READY_POST = {
  id: "agentic-1",
  userId: "user-1",
  xAccountId: "acc-1",
  status: "ready",
  topic: "AI tools",
  tweets: [
    {
      position: 0,
      text: "Tweet 1",
      hashtags: ["AI"],
      hasImage: false,
      charCount: 50,
    },
  ],
};

const TWEETS_PAYLOAD = [
  {
    position: 0,
    text: "Tweet 1",
    hashtags: ["AI"],
    hasImage: false,
    charCount: 50,
  },
];

function makeRequest(body: object) {
  return new Request("http://localhost/api/ai/agentic/agentic-1/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/ai/agentic/[id]/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated session
    vi.mocked(auth.api.getSession).mockResolvedValue(SESSION as never);
    // Default: post found and ready
    mockFindFirst.mockResolvedValue(READY_POST);
  });

  it("post_now: returns 200 with action and calls transaction", async () => {
    const res = await POST(makeRequest({ action: "post_now", tweets: TWEETS_PAYLOAD }), {
      params: Promise.resolve({ id: "agentic-1" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { action: string };
    expect(body.action).toBe("post_now");
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("schedule: returns 200 with action and calls transaction", async () => {
    const res = await POST(
      makeRequest({
        action: "schedule",
        scheduledAt: "2026-05-01T09:00:00Z",
        tweets: TWEETS_PAYLOAD,
      }),
      { params: Promise.resolve({ id: "agentic-1" }) }
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { action: string };
    expect(body.action).toBe("schedule");
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("save_draft: returns 200 with action", async () => {
    const res = await POST(makeRequest({ action: "save_draft", tweets: TWEETS_PAYLOAD }), {
      params: Promise.resolve({ id: "agentic-1" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { action: string };
    expect(body.action).toBe("save_draft");
  });

  it("unauthorized: returns 401 when no session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as never);

    const res = await POST(makeRequest({ action: "post_now", tweets: TWEETS_PAYLOAD }), {
      params: Promise.resolve({ id: "agentic-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("ownership check: returns 404 when post not found for user", async () => {
    // findFirst returns null → ownership fails or post doesn't exist
    mockFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest({ action: "post_now", tweets: TWEETS_PAYLOAD }), {
      params: Promise.resolve({ id: "agentic-1" }),
    });

    expect(res.status).toBe(404);
  });

  it("wrong status: returns 400 when post status is not 'ready'", async () => {
    mockFindFirst.mockResolvedValue({ ...READY_POST, status: "generating" });

    const res = await POST(makeRequest({ action: "post_now", tweets: TWEETS_PAYLOAD }), {
      params: Promise.resolve({ id: "agentic-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("schedule without scheduledAt: returns 400", async () => {
    const res = await POST(makeRequest({ action: "schedule", tweets: TWEETS_PAYLOAD }), {
      params: Promise.resolve({ id: "agentic-1" }),
    });

    expect(res.status).toBe(400);
  });
});
