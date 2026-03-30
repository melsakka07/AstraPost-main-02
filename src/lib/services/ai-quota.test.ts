import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { getMonthlyAiUsage } from "@/lib/services/ai-quota";

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      user: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
  },
}));

describe("getMonthlyAiUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns used and limit for free plan", async () => {
    const where = vi.fn().mockResolvedValue([{ count: 3 }]);
    const from = vi.fn().mockReturnValue({ where });

    (db.query.user.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      plan: "free",
    });
    (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const usage = await getMonthlyAiUsage("user_1");

    expect(usage.used).toBe(3);
    expect(usage.limit).toBe(20);
    expect(typeof usage.resetDate).toBe("string");
  });

  it("returns null limit for unlimited plans", async () => {
    const where = vi.fn().mockResolvedValue([{ count: 42 }]);
    const from = vi.fn().mockReturnValue({ where });

    (db.query.user.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      plan: "agency",
    });
    (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const usage = await getMonthlyAiUsage("user_2");

    expect(usage.used).toBe(42);
    expect(usage.limit).toBeNull();
  });
});
