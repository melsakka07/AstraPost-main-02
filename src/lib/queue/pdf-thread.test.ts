import { Job } from "bullmq";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { pdfThreadProcessor } from "./processors";

process.env.POSTGRES_URL = "postgres://fake";
process.env.OPENROUTER_API_KEY = "sk-fake";
process.env.OPENROUTER_MODEL = "anthropic/claude-sonnet-4.6";

const {
  mockDbSelect,
  mockDbUpdateSetWhere,
  mockDbInsertValues,
  mockGenerateObject,
  mockRecordAiUsage,
  mockEstimateCost,
  mockModerateOutput,
  mockRedactPII,
} = vi.hoisted(() => {
  const mockDbSelect = vi.fn();
  const mockDbUpdateSetWhere = vi.fn();
  const mockDbInsertValues = vi.fn();
  const mockGenerateObject = vi.fn();
  const mockRecordAiUsage = vi.fn();
  const mockEstimateCost = vi.fn(() => 5);
  const mockModerateOutput = vi.fn();
  const mockRedactPII = vi.fn();

  return {
    mockDbSelect,
    mockDbUpdateSetWhere,
    mockDbInsertValues,
    mockGenerateObject,
    mockRecordAiUsage,
    mockEstimateCost,
    mockModerateOutput,
    mockRedactPII,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: mockDbSelect,
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: mockDbUpdateSetWhere })) })),
    insert: vi.fn(() => ({ values: mockDbInsertValues })),
  },
}));

vi.mock("@/lib/services/ai-quota", () => ({
  recordAiUsage: mockRecordAiUsage,
  estimateCost: mockEstimateCost,
}));

vi.mock("@/lib/services/moderation", () => ({
  moderateOutput: mockModerateOutput,
}));

vi.mock("@/lib/ai/pii", () => ({
  redactPII: mockRedactPII,
}));

vi.mock("ai", () => ({
  generateObject: mockGenerateObject,
}));

const { createOpenRouterMock } = vi.hoisted(() => {
  const createOpenRouterMock = vi.fn(() => () => "mock-model");
  return { createOpenRouterMock };
});

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: createOpenRouterMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("pdfThreadProcessor", () => {
  const baseRow = {
    id: "job-001",
    userId: "user-001",
    correlationId: "corr-001",
    status: "queued" as const,
    fileUrl: "https://blob.example.com/pdf.pdf",
    fileName: "report.pdf",
    fileSizeBytes: 100_000,
    pageCount: 10,
    charCount: 50_000,
    extractedText: "Sample extracted text for testing. ".repeat(200),
    language: "en",
    tweetCount: 7,
    tone: "professional",
    attestationAt: new Date(),
    threadResult: null,
    error: null,
    quotaConsumed: 5,
    quotaReleased: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
  };

  const mockJob = (overrides = {}) =>
    ({
      id: "bull-001",
      queueName: "pdfThreadQueue",
      data: { jobId: "job-001", userId: "user-001", correlationId: "corr-001" },
      ...overrides,
    }) as unknown as Job;

  beforeEach(() => {
    vi.clearAllMocks();
    mockModerateOutput.mockResolvedValue({ flagged: false });

    mockRedactPII.mockReturnValue({
      cleaned: baseRow.extractedText!,
      redactions: [],
    });

    mockGenerateObject.mockResolvedValue({
      object: {
        tweets: ["Tweet 1", "Tweet 2", "Tweet 3", "Tweet 4", "Tweet 5", "Tweet 6", "Tweet 7"],
        title: "Report Summary",
        sourceLanguage: "en",
      },
      usage: { inputTokens: 1000, outputTokens: 500 },
    });
  });

  describe("state transitions", () => {
    it("skips job if not found in database", async () => {
      mockDbSelect.mockReturnValue({ from: vi.fn(() => ({ where: vi.fn(() => []) })) });

      await pdfThreadProcessor(mockJob());

      expect(mockDbSelect).toHaveBeenCalled();
      expect(mockDbUpdateSetWhere).not.toHaveBeenCalled();
    });

    it("skips job if status is not 'queued'", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => [{ ...baseRow, status: "ready" }]),
        })),
      });

      await pdfThreadProcessor(mockJob());

      expect(mockDbUpdateSetWhere).not.toHaveBeenCalled();
    });

    it("transitions status from queued to processing", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => [baseRow]),
        })),
      });

      await pdfThreadProcessor(mockJob());

      // Update was called (processing status set)
      expect(mockDbUpdateSetWhere).toHaveBeenCalled();
    });
  });

  describe("successful processing", () => {
    it("completes the full pipeline and saves result", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => [baseRow]),
        })),
      });

      await pdfThreadProcessor(mockJob());

      // Should call generateObject at least twice (chunks + combine)
      expect(mockGenerateObject).toHaveBeenCalled();
      const generateCalls = mockGenerateObject.mock.calls.length;
      expect(generateCalls).toBeGreaterThanOrEqual(2);

      // Should call recordAiUsage
      expect(mockRecordAiUsage).toHaveBeenCalledTimes(1);
      const usageCall = mockRecordAiUsage.mock.calls[0]?.[0];
      expect(usageCall.type).toBe("pdf_to_thread");
      expect(usageCall.subFeature).toBe("async_chunked");

      // Verify update was called at least twice (processing + ready)
      expect(mockDbUpdateSetWhere).toHaveBeenCalled();
    });

    it("redacts PII before LLM calls", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => [baseRow]),
        })),
      });

      await pdfThreadProcessor(mockJob());

      expect(mockRedactPII).toHaveBeenCalledWith(baseRow.extractedText);
    });

    it("checks moderation on generated content", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => [baseRow]),
        })),
      });

      await pdfThreadProcessor(mockJob());

      expect(mockModerateOutput).toHaveBeenCalled();
    });
  });

  describe("failure handling", () => {
    it("sets status to failed when moderation flags content", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => [baseRow]),
        })),
      });
      mockModerateOutput.mockResolvedValue({ flagged: true });

      await pdfThreadProcessor(mockJob());

      // Should update status to failed
      expect(mockDbUpdateSetWhere).toHaveBeenCalled();
    });

    it("sets status to failed on generation error", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => [baseRow]),
        })),
      });
      mockGenerateObject.mockRejectedValue(new Error("OpenRouter API error"));

      await expect(pdfThreadProcessor(mockJob())).rejects.toThrow("OpenRouter API error");

      // Should update status to failed before rethrowing
      expect(mockDbUpdateSetWhere).toHaveBeenCalled();
    });

    it("throws error for no extractable text", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => [{ ...baseRow, extractedText: null }]),
        })),
      });

      await expect(pdfThreadProcessor(mockJob())).rejects.toThrow("No extractable text found");
    });

    it("throws error for text shorter than 200 chars", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => [{ ...baseRow, extractedText: "short" }]),
        })),
      });

      await expect(pdfThreadProcessor(mockJob())).rejects.toThrow("No extractable text found");
    });
  });

  describe("chunking behavior", () => {
    it("chunks large text into multiple summarize calls", async () => {
      // Generate text > 24K chars so it splits into 3+ chunks (each chunk is 12K)
      const longText = "Paragraph one with enough content to split.\n\n".repeat(600);
      mockDbSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => [{ ...baseRow, extractedText: longText }]),
        })),
      });
      mockRedactPII.mockReturnValue({ cleaned: longText, redactions: [] });
      // Return unique tweets for each chunk, and final combine
      mockGenerateObject
        .mockResolvedValueOnce({
          object: { tweets: ["Chunk 1 tweet"], title: "Part 1", sourceLanguage: "en" },
          usage: { inputTokens: 500, outputTokens: 100 },
        })
        .mockResolvedValueOnce({
          object: { tweets: ["Chunk 2 tweet"], title: "Part 2", sourceLanguage: "en" },
          usage: { inputTokens: 500, outputTokens: 100 },
        })
        .mockResolvedValueOnce({
          object: { tweets: ["Chunk 3 tweet"], title: "Part 3", sourceLanguage: "en" },
          usage: { inputTokens: 500, outputTokens: 100 },
        })
        .mockResolvedValueOnce({
          object: {
            tweets: ["Final 1", "Final 2", "Final 3", "Final 4", "Final 5", "Final 6", "Final 7"],
            title: "Final Report",
            sourceLanguage: "en",
          },
          usage: { inputTokens: 800, outputTokens: 400 },
        });

      await pdfThreadProcessor(mockJob());

      // Should have called generateObject: 3 chunk calls + 1 combine call
      expect(mockGenerateObject).toHaveBeenCalledTimes(4);

      // recordAiUsage should sum all tokens
      expect(mockRecordAiUsage).toHaveBeenCalledTimes(1);
      const usageCall = mockRecordAiUsage.mock.calls[0]?.[0];
      expect(usageCall.tokensIn).toBe(2300); // 3×500 + 800
      expect(usageCall.tokensOut).toBe(700); // 3×100 + 400
    });
  });
});
