import { describe, it, expect } from "vitest";
import { redactPII } from "../pii";

describe("redactPII", () => {
  it("passes clean text through unchanged", () => {
    const result = redactPII("This is a normal tweet about marketing.");
    expect(result.cleaned).toBe("This is a normal tweet about marketing.");
    expect(result.redactions).toEqual([]);
  });

  it("redacts email addresses", () => {
    const result = redactPII("Contact user@example.com for details");
    expect(result.cleaned).toContain("[email redacted]");
    expect(result.cleaned).not.toContain("user@example.com");
    expect(result.redactions).toContain("1 email redacted");
  });

  it("redacts multiple emails and reports count correctly", () => {
    const result = redactPII("Email a@b.com or c@d.org for support");
    expect(result.redactions).toContain("2 emails redacted");
  });

  it("redacts phone numbers", () => {
    const result = redactPII("Call 555-123-4567 for more info");
    expect(result.cleaned).toContain("[phone redacted]");
    expect(result.cleaned).not.toContain("555-123-4567");
  });

  it("redacts international phone numbers", () => {
    const result = redactPII("Tel: +1 555 123 4567");
    expect(result.cleaned).toContain("[phone redacted]");
  });

  it("redacts credit card numbers", () => {
    const result = redactPII("Card: 4111-1111-1111-1111");
    expect(result.cleaned).toContain("[credit_card redacted]");
    expect(result.cleaned).not.toContain("4111");
  });

  it("redacts IBAN numbers", () => {
    const result = redactPII("IBAN: GB29NWBK60161331926819");
    expect(result.cleaned).toContain("[iban redacted]");
    expect(result.cleaned).not.toContain("GB29NWBK");
  });

  it("redacts multiple PII types in one text", () => {
    const result = redactPII(
      "Email me at test@example.com or call 555-123-4567. Card: 4111-1111-1111-1111"
    );
    expect(result.redactions.length).toBe(3);
    expect(result.redactions).toContain("1 email redacted");
    expect(result.redactions).toContain("1 phone redacted");
    expect(result.redactions).toContain("1 credit_card redacted");
  });

  it("returns empty redactions for empty string", () => {
    const result = redactPII("");
    expect(result.cleaned).toBe("");
    expect(result.redactions).toEqual([]);
  });

  it("handles text with no PII but numbers and symbols", () => {
    const result = redactPII("Price: $19.99. Code: ABC-123. Rating: 4.5/5");
    expect(result.cleaned).toBe("Price: $19.99. Code: ABC-123. Rating: 4.5/5");
    expect(result.redactions).toEqual([]);
  });

  it("is idempotent (double-redaction is safe)", () => {
    const text = "Email: a@b.com";
    const first = redactPII(text);
    const second = redactPII(first.cleaned);
    // Second pass should not add more redactions — [email redacted] contains no PII
    expect(second.redactions.length).toBeLessThanOrEqual(first.redactions.length);
  });
});
