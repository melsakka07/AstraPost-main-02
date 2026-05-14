import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

const {
  mockDbQueryTeamInvitationsFindFirst,
  mockDbQueryUserFindFirst,
  mockDbSelectFn,
  mockDbInsertFn,
  mockSendTeamInvitationEmail,
  mockGetTeamContext,
  mockCheckTeamMemberLimitDetailed,
  mockCreatePlanLimitResponse,
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
  const mockCheckTeamMemberLimitDetailed = vi.fn();
  const mockCreatePlanLimitResponse = vi.fn();

  return {
    mockDbQueryTeamInvitationsFindFirst,
    mockDbQueryUserFindFirst,
    mockDbSelectFn,
    mockDbInsertFn,
    mockSendTeamInvitationEmail,
    mockGetTeamContext,
    mockCheckTeamMemberLimitDetailed,
    mockCreatePlanLimitResponse,
  };
});

vi.mock("@/lib/team-context", () => ({
  getTeamContext: mockGetTeamContext,
}));

vi.mock("@/lib/middleware/require-plan", () => ({
  checkTeamMemberLimitDetailed: mockCheckTeamMemberLimitDetailed,
  createPlanLimitResponse: mockCreatePlanLimitResponse,
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

    // Gate: allowed by default
    mockCheckTeamMemberLimitDetailed.mockResolvedValue({ allowed: true });
    mockCreatePlanLimitResponse.mockReturnValue(
      new Response(JSON.stringify({ error: "upgrade_required" }), { status: 402 })
    );
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

  it("returns 402 if not on agency plan", async () => {
    mockCheckTeamMemberLimitDetailed.mockResolvedValue({
      allowed: false,
      error: "upgrade_required",
      feature: "team_members",
      message: "Team members are only available on the Agency plan.",
    });

    const req = new Request("http://localhost/api/team/invite", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", role: "editor" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(402);
    expect(mockCreatePlanLimitResponse).toHaveBeenCalled();
  });

  it("returns 402 if team member limit reached", async () => {
    mockCheckTeamMemberLimitDetailed.mockResolvedValue({
      allowed: false,
      error: "upgrade_required",
      feature: "team_members",
      message: "You have reached the maximum of 5 team members.",
    });

    const req = new Request("http://localhost/api/team/invite", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", role: "editor" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(402);
    expect(mockCreatePlanLimitResponse).toHaveBeenCalled();
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
