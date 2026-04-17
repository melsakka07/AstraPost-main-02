import { Job } from "bullmq";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyticsProcessor } from "../processors";

process.env.POSTGRES_URL = "postgres://fake";

vi.mock("@/lib/db", () => ({ db: {} }));

const { mockRefreshFollowers, mockUpdateTweetMetrics } = vi.hoisted(() => {
  return {
    mockRefreshFollowers: vi.fn(),
    mockUpdateTweetMetrics: vi.fn(),
  };
});

vi.mock("@/lib/services/analytics", () => ({
  refreshFollowersAndMetricsForRuns: mockRefreshFollowers,
  updateTweetMetrics: mockUpdateTweetMetrics,
}));

describe("analyticsProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = "postgres://fake";
  });

  it("calls refreshFollowersAndMetricsForRuns when runIds are provided", async () => {
    const job = {
      id: "job-123",
      queueName: "analytics-queue",
      data: {
        correlationId: "corr-123",
        runIds: ["run-1", "run-2"],
      },
    } as unknown as Job;

    await analyticsProcessor(job);

    expect(mockRefreshFollowers).toHaveBeenCalledWith(["run-1", "run-2"]);
    expect(mockUpdateTweetMetrics).not.toHaveBeenCalled();
  });

  it("calls updateTweetMetrics when runIds are empty", async () => {
    const job = {
      id: "job-123",
      queueName: "analytics-queue",
      data: {
        correlationId: "corr-123",
        runIds: [],
      },
    } as unknown as Job;

    await analyticsProcessor(job);

    expect(mockUpdateTweetMetrics).toHaveBeenCalled();
    expect(mockRefreshFollowers).not.toHaveBeenCalled();
  });

  it("calls updateTweetMetrics when runIds are missing", async () => {
    const job = {
      id: "job-123",
      queueName: "analytics-queue",
      data: {
        correlationId: "corr-123",
      },
    } as unknown as Job;

    await analyticsProcessor(job);

    expect(mockUpdateTweetMetrics).toHaveBeenCalled();
    expect(mockRefreshFollowers).not.toHaveBeenCalled();
  });
});
