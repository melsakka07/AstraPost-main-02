import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

const {
  mockDbQueryTeamInvitationsFindFirst,
  mockDbQueryTeamMembersFindFirst,
  mockDbUpdateFn,
  mockDbInsertFn,
} = vi.hoisted(() => {
  const mockDbQueryTeamInvitationsFindFirst = vi.fn();
  const mockDbQueryTeamMembersFindFirst = vi.fn();

  const mockDbUpdateFn = vi.fn(() => ({
    set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  }));
  const mockDbInsertFn = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));

  return {
    mockDbQueryTeamInvitationsFindFirst,
    mockDbQueryTeamMembersFindFirst,
    mockDbUpdateFn,
    mockDbInsertFn,
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
      teamInvitations: { findFirst: mockDbQueryTeamInvitationsFindFirst },
      teamMembers: { findFirst: mockDbQueryTeamMembersFindFirst },
    },
    update: mockDbUpdateFn,
    insert: mockDbInsertFn,
  },
}));

describe("POST /api/team/join", async () => {
  const { auth } = await import("@/lib/auth");
  const mockedAuth = auth as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.api.getSession.mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
    });
  });

  it("returns 401 if unauthenticated", async () => {
    mockedAuth.api.getSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/team/join", {
      method: "POST",
      body: JSON.stringify({ token: "valid-token" }),
    }) as any;

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 if token is missing", async () => {
    const req = new Request("http://localhost/api/team/join", {
      method: "POST",
      body: JSON.stringify({}),
    }) as any;

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 if invitation not found", async () => {
    mockDbQueryTeamInvitationsFindFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/team/join", {
      method: "POST",
      body: JSON.stringify({ token: "invalid-token" }),
    }) as any;

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 400 if invitation is not pending", async () => {
    mockDbQueryTeamInvitationsFindFirst.mockResolvedValue({
      status: "accepted",
      expiresAt: new Date(Date.now() + 86400000), // Future
    });

    const req = new Request("http://localhost/api/team/join", {
      method: "POST",
      body: JSON.stringify({ token: "valid-token" }),
    }) as any;

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/no longer valid/);
  });

  it("returns 400 if invitation is expired", async () => {
    mockDbQueryTeamInvitationsFindFirst.mockResolvedValue({
      status: "pending",
      expiresAt: new Date(Date.now() - 86400000), // Past
    });

    const req = new Request("http://localhost/api/team/join", {
      method: "POST",
      body: JSON.stringify({ token: "valid-token" }),
    }) as any;

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/expired/);
  });

  it("handles user who is already a member", async () => {
    mockDbQueryTeamInvitationsFindFirst.mockResolvedValue({
      id: "invite-123",
      teamId: "team-123",
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000), // Future
    });

    mockDbQueryTeamMembersFindFirst.mockResolvedValue({
      id: "member-123",
      teamId: "team-123",
      userId: "user-123",
    });

    const req = new Request("http://localhost/api/team/join", {
      method: "POST",
      body: JSON.stringify({ token: "valid-token" }),
    }) as any;

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Should update invite to accepted but NOT insert a new member
    expect(mockDbUpdateFn).toHaveBeenCalled();
    expect(mockDbInsertFn).not.toHaveBeenCalled();
  });

  it("adds user to team and marks invite as accepted", async () => {
    mockDbQueryTeamInvitationsFindFirst.mockResolvedValue({
      id: "invite-123",
      teamId: "team-123",
      role: "editor",
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000), // Future
    });

    mockDbQueryTeamMembersFindFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/team/join", {
      method: "POST",
      body: JSON.stringify({ token: "valid-token" }),
    }) as any;

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockDbInsertFn).toHaveBeenCalled();
    expect(mockDbUpdateFn).toHaveBeenCalled();
  });
});
