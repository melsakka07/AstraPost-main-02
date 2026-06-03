import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { getMonthlyAiUsage } from "@/lib/services/ai-quota";
import { getAiUsageUnits } from "@/lib/services/ai-quota-atomic";

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      user: {
        findFirst: vi.fn(),
      },
    },
  },
}));

// getMonthlyAiUsage now reads the authoritative weighted counter via
// getAiUsageUnits — mock it directly so the test asserts the plan-limit mapping.
vi.mock("@/lib/services/ai-quota-atomic", () => ({
  getAiUsageUnits: vi.fn(),
}));

const mockGetAiUsageUnits = getAiUsageUnits as unknown as ReturnType<typeof vi.fn>;

describe("getMonthlyAiUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns used (weighted counter) and limit for free plan", async () => {
    (db.query.user.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      plan: "free",
    });
    mockGetAiUsageUnits.mockResolvedValue({ used: 3, resetAt: new Date() });

    const usage = await getMonthlyAiUsage("user_1");

    expect(usage.used).toBe(3);
    expect(usage.limit).toBe(20);
    expect(typeof usage.resetDate).toBe("string");
  });

  it("returns null limit for unlimited plans", async () => {
    (db.query.user.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      plan: "agency",
    });
    mockGetAiUsageUnits.mockResolvedValue({ used: 42, resetAt: new Date() });

    const usage = await getMonthlyAiUsage("user_2");

    expect(usage.used).toBe(42);
    expect(usage.limit).toBeNull();
  });
});
