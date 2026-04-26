import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

const {
  mockDbQueryTeamInvitationsFindFirst,
  mockDbQueryUserFindFirst,
  mockDbSelectFn,
  mockDbInsertFn,
  mockSendTeamInvitationEmail,
  mockGetTeamContext,
} = vi.hoisted(() => {
  const mockDbQueryTeamInvitationsFindFirst = vi.fn();
  const mockDbQueryUserFindFirst = vi.fn();

  const mockDbSelectFn = vi.fn(() => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      then: (resolve: any) => resolve([{ count: 1 }]),
    };
    return chain;
  });

  const mockDbInsertFn = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
  const mockSendTeamInvitationEmail = vi.fn();
  const mockGetTeamContext = vi.fn();

  return {
    mockDbQueryTeamInvitationsFindFirst,
    mockDbQueryUserFindFirst,
    mockDbSelectFn,
    mockDbInsertFn,
    mockSendTeamInvitationEmail,
    mockGetTeamContext,
  };
});

vi.mock("@/lib/team-context", () => ({
  getTeamContext: mockGetTeamContext,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      teamInvitations: { findFirst: mockDbQueryTeamInvitationsFindFirst },
      user: { findFirst: mockDbQueryUserFindFirst },
    },
    select: mockDbSelectFn,
    insert: mockDbInsertFn,
  },
}));

vi.mock("@/lib/services/email", () => ({
  sendTeamInvitationEmail: mockSendTeamInvitationEmail,
}));

describe("POST /api/team/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetTeamContext.mockResolvedValue({
      currentTeamId: "team-123",
      isOwner: true,
      role: "owner",
      session: { user: { id: "user-123" } },
    });

    mockDbQueryUserFindFirst.mockResolvedValue({
      plan: "agency",
      name: "Agency Owner",
    });

    // Simulate current count: 1 member, 0 invites = 1 used
    mockDbSelectFn.mockImplementation(() => {
      const chain: any = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        then: (resolve: any) => resolve([{ count: 1 }]),
      };
      return chain;
    });
  });

  it("returns 401 if unauthenticated", async () => {
    mockGetTeamContext.mockResolvedValue(null);

    const req = new Request("http://localhost/api/team/invite", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", role: "editor" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("returns 403 if not owner or admin", async () => {
    mockGetTeamContext.mockResolvedValue({
      currentTeamId: "team-123",
      isOwner: false,
      role: "viewer",
    });

    const req = new Request("http://localhost/api/team/invite", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", role: "editor" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/Only owners and admins/);
  });

  it("returns 403 if not on agency plan", async () => {
    mockDbQueryUserFindFirst.mockResolvedValue({
      plan: "pro_monthly",
      name: "Pro User",
    });

    const req = new Request("http://localhost/api/team/invite", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", role: "editor" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/Agency plan/);
  });

  it("returns 403 if team member limit reached", async () => {
    mockDbSelectFn.mockImplementation(() => {
      const chain: any = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        then: (resolve: any) => resolve([{ count: 10 }]), // 10 members limit reached
      };
      return chain;
    });

    const req = new Request("http://localhost/api/team/invite", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", role: "editor" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/reached the maximum/);
  });

  it("returns 409 if invitation already pending", async () => {
    mockDbQueryTeamInvitationsFindFirst.mockResolvedValue({
      id: "invite-123",
    });

    const req = new Request("http://localhost/api/team/invite", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", role: "editor" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/already pending/);
  });

  it("creates invitation and sends email", async () => {
    mockDbQueryTeamInvitationsFindFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/team/invite", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", role: "editor" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);

    expect(mockDbInsertFn).toHaveBeenCalled();
    expect(mockSendTeamInvitationEmail).toHaveBeenCalledWith(
      "test@example.com",
      expect.any(String),
      "Agency Owner",
      "en"
    );
  });
});
