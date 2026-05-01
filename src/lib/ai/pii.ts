import "server-only";

// ============================================================================
// PII Pattern Definitions
// ============================================================================

/**
 * Regex patterns for detecting personally identifiable information (PII).
 *
 * Each entry maps a human-readable name to a RegExp that matches that type
 * of PII. The order is intentional: longer/more-specific patterns (URLs)
 * come first to avoid partial matches on shorter patterns (domains).
 */
const PII_PATTERNS: { name: string; regex: RegExp }[] = [
  {
    name: "email",
    regex: /\b[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9-]{1,63}(?:\.[a-zA-Z0-9-]{1,63})*\.[a-zA-Z]{2,}\b/g,
  },
  {
    name: "phone",
    regex: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  },
  {
    name: "credit_card",
    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  },
  {
    name: "iban",
    regex: /\b[A-Z]{2}\d{2}\s?[A-Z0-9]{1,30}\b/g,
  },
];

// ============================================================================
// Types
// ============================================================================

export interface RedactionResult {
  /** The text with all PII replaced by placeholders */
  cleaned: string;
  /** Human-readable summary of what was redacted, e.g. ["2 emails redacted", "1 phone redacted"] */
  redactions: string[];
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Scans text for common PII patterns (email, phone, credit card, IBAN)
 * and replaces each occurrence with a `[type redacted]` placeholder.
 *
 * This is a client-side / pre-prompt step — no data is persisted.
 * The goal is to prevent PII from being sent to third-party AI providers.
 *
 * @param text - The raw user-provided or fetched text
 * @returns A RedactionResult with the cleaned text and a summary of redactions
 *
 * @example
 *   const result = redactPII("Call me at user@example.com or 555-123-4567");
 *   // result.cleaned     → "Call me at [email redacted] or [phone redacted]"
 *   // result.redactions  → ["1 email redacted", "1 phone redacted"]
 */
export function redactPII(text: string): RedactionResult {
  const redactions: string[] = [];
  let cleaned = text;

  for (const { name, regex } of PII_PATTERNS) {
    // Reset lastIndex since shared regexes can carry state
    regex.lastIndex = 0;

    const matches = cleaned.match(regex);
    if (matches && matches.length > 0) {
      const count = matches.length;
      redactions.push(`${count} ${name}${count > 1 ? "s" : ""} redacted`);
      cleaned = cleaned.replace(regex, `[${name} redacted]`);
    }
  }

  return { cleaned, redactions };
}
