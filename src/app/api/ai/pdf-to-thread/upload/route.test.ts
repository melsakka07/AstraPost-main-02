import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

process.env.POSTGRES_URL = "postgres://fake";

const {
  mockTeamContext,
  mockRateLimitSuccess,
  mockPlanGateAllowed,
  mockPdfParseGetText,
  mockUpload,
  mockDeleteFile,
  mockSanitizeFilename,
  mockDbValues,
} = vi.hoisted(() => {
  const mockTeamContext = vi.fn();
  const mockRateLimitSuccess = vi.fn();
  const mockPlanGateAllowed = vi.fn();
  const mockPdfParseGetText = vi.fn();
  const mockUpload = vi.fn();
  const mockDeleteFile = vi.fn();
  const mockSanitizeFilename = vi.fn();
  const mockDbValues = vi.fn();

  return {
    mockTeamContext,
    mockRateLimitSuccess,
    mockPlanGateAllowed,
    mockPdfParseGetText,
    mockUpload,
    mockDeleteFile,
    mockSanitizeFilename,
    mockDbValues,
  };
});

vi.mock("@/lib/team-context", () => ({
  getTeamContext: mockTeamContext,
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: mockRateLimitSuccess,
  createRateLimitResponse: vi.fn(() => new Response("Rate limited", { status: 429 })),
}));

vi.mock("@/lib/middleware/require-plan", () => ({
  checkPdfToThreadAccessDetailed: mockPlanGateAllowed,
  createPlanLimitResponse: vi.fn(() => new Response("Plan limit", { status: 402 })),
  getUserPlanType: vi.fn().mockResolvedValue("pro"),
}));

// Use a plain function (not arrow) for PDFParse so `new` works correctly
vi.mock("pdf-parse", () => ({
  PDFParse: vi.fn(function (this: Record<string, unknown>, _opts: { data: Buffer }) {
    this.getText = () => mockPdfParseGetText();
    this.destroy = vi.fn();
  }),
}));

vi.mock("@/lib/ai/with-timeout", () => ({
  withTimeout: vi.fn(async (promise: Promise<unknown>) => promise),
}));

vi.mock("@/lib/storage", () => ({
  upload: mockUpload,
  deleteFile: mockDeleteFile,
  sanitizeFilename: mockSanitizeFilename,
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({ values: mockDbValues })),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/correlation", () => ({
  getCorrelationId: vi.fn(() => "test-correlation-id"),
}));

// Helper: create a valid PDF buffer (starts with %PDF-)
function makePdfBuffer(content = "Sample PDF content for testing purposes."): Buffer {
  const body = Buffer.from(content, "utf-8");
  const header = Buffer.from("%PDF-1.4\n");
  return Buffer.concat([header, body]);
}

// Helper: create FormData with a PDF file
function createPdfFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const pdfBuffer = makePdfBuffer();
  const file = new File([new Uint8Array(pdfBuffer)], "test.pdf", { type: "application/pdf" });
  fd.set("file", file);
  fd.set("language", overrides.language ?? "en");
  fd.set("tweetCount", overrides.tweetCount ?? "7");
  fd.set("tone", overrides.tone ?? "professional");
  fd.set("attestation", overrides.attestation ?? "true");
  return fd;
}

// Helper: create a non-PDF buffer (magic bytes don't match)
function makeNonPdfFormData(): FormData {
  const fd = new FormData();
  const buffer = Buffer.from("This is not a PDF file", "utf-8");
  const file = new File([new Uint8Array(buffer)], "fake.pdf", { type: "application/pdf" });
  fd.set("file", file);
  fd.set("language", "en");
  fd.set("tweetCount", "7");
  fd.set("tone", "professional");
  fd.set("attestation", "true");
  return fd;
}

describe("POST /api/ai/pdf-to-thread/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockTeamContext.mockResolvedValue({
      currentTeamId: "user-001",
      session: { user: { id: "user-001" } },
      role: "owner",
    });

    mockRateLimitSuccess.mockResolvedValue({ success: true });
    mockPlanGateAllowed.mockResolvedValue({ allowed: true });
    mockSanitizeFilename.mockReturnValue("test.pdf");
    mockUpload.mockResolvedValue({ url: "https://blob.example.com/test.pdf" });
    mockPdfParseGetText.mockResolvedValue({
      text: "Sample PDF content for testing purposes. ".repeat(20),
      total: 5,
    });
    mockDbValues.mockResolvedValue(undefined);
  });

  // ── Auth ──────────────────────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    mockTeamContext.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: createPdfFormData(),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role", async () => {
    mockTeamContext.mockResolvedValue({
      currentTeamId: "user-001",
      session: { user: { id: "user-001" } },
      role: "viewer",
    });

    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: createPdfFormData(),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  // ── Plan gate ─────────────────────────────────────────────────────

  it("returns 402 when plan gate rejects", async () => {
    mockPlanGateAllowed.mockResolvedValue({
      allowed: false,
      code: "PLAN_TOO_LOW",
      message: "Upgrade to Pro",
    });

    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: createPdfFormData(),
    });

    const res = await POST(req);
    expect(res.status).toBe(402);
  });

  // ── Magic-byte validation ─────────────────────────────────────────

  it("rejects non-PDF files with code NOT_A_PDF", async () => {
    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: makeNonPdfFormData(),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe("NOT_A_PDF");
  });

  // ── Attestation enforcement ───────────────────────────────────────

  it("rejects upload when attestation is missing", async () => {
    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: createPdfFormData({ attestation: "false" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe("ATTESTATION_REQUIRED");
  });

  it("rejects upload when attestation is not 'true'", async () => {
    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: createPdfFormData({ attestation: "" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe("ATTESTATION_REQUIRED");
  });

  // ── PDF parse failure ─────────────────────────────────────────────

  it("returns PDF_PARSE_FAILED when pdf-parse throws", async () => {
    mockPdfParseGetText.mockRejectedValue(new Error("Corrupted PDF"));

    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: createPdfFormData(),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe("PDF_PARSE_FAILED");
    expect(mockDeleteFile).toHaveBeenCalled();
  });

  // ── Page cap ──────────────────────────────────────────────────────

  it("rejects PDFs with more than 200 pages", async () => {
    mockPdfParseGetText.mockResolvedValue({
      text: "Valid content for testing. ".repeat(50),
      total: 250,
    });

    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: createPdfFormData(),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe("PDF_TOO_MANY_PAGES");
    expect(mockDeleteFile).toHaveBeenCalled();
  });

  // ── Empty text ────────────────────────────────────────────────────

  it("rejects PDFs with fewer than 200 characters of text", async () => {
    mockPdfParseGetText.mockResolvedValue({
      text: "short",
      total: 2,
    });

    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: createPdfFormData(),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe("PDF_NO_TEXT_LAYER");
    expect(mockDeleteFile).toHaveBeenCalled();
  });

  // ── Missing file ──────────────────────────────────────────────────

  it("returns 400 when no file is provided", async () => {
    const fd = new FormData();
    fd.set("language", "en");
    fd.set("tweetCount", "7");
    fd.set("tone", "professional");
    fd.set("attestation", "true");

    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: fd,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── Successful upload ─────────────────────────────────────────────

  it("returns job details on successful upload", async () => {
    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: createPdfFormData(),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-correlation-id")).toBe("test-correlation-id");

    const data = await res.json();
    expect(data.jobId).toBeDefined();
    expect(data.charCount).toBeGreaterThan(0);
    expect(data.pageCount).toBe(5);
    expect(data.syncEligible).toBe(true);
    expect(data.fileName).toBe("test.pdf");
  });

  it("sets syncEligible: false when text exceeds 30K characters", async () => {
    mockPdfParseGetText.mockResolvedValue({
      text: "x".repeat(35_000),
      total: 100,
    });

    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: createPdfFormData(),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(data.syncEligible).toBe(false);
  });

  // ── Language validation ───────────────────────────────────────────

  it("rejects invalid language values", async () => {
    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: createPdfFormData({ language: "fr" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── Tweet count validation ────────────────────────────────────────

  it("rejects tweetCount below 3", async () => {
    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: createPdfFormData({ tweetCount: "1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects tweetCount above 15", async () => {
    const req = new NextRequest("http://localhost/api/ai/pdf-to-thread/upload", {
      method: "POST",
      body: createPdfFormData({ tweetCount: "20" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
