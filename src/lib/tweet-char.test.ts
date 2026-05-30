import { describe, expect, it } from "vitest";
import {
  STANDARD_TWEET_LIMIT,
  MEDIUM_ZONE_LIMIT,
  getTweetWeightedLength,
  getTweetMaxChars,
  getTweetLengthZone,
  getTweetCharSeverity,
  computeTweetCharCount,
} from "./tweet-char";

describe("constants", () => {
  it("standard limit is 280 and medium zone is 1000", () => {
    expect(STANDARD_TWEET_LIMIT).toBe(280);
    expect(MEDIUM_ZONE_LIMIT).toBe(1_000);
  });
});

describe("getTweetWeightedLength", () => {
  it("counts plain ASCII as raw length", () => {
    expect(getTweetWeightedLength("hello")).toBe(5);
    expect(getTweetWeightedLength("")).toBe(0);
  });

  it("collapses a URL to its weighted length (23), not its raw length", () => {
    const url = "https://example.com/some/very/long/path?with=query&params=here";
    expect(url.length).toBeGreaterThan(23);
    // twitter-text counts any http(s) URL as 23 weighted chars.
    expect(getTweetWeightedLength(url)).toBe(23);
  });

  it("weights emoji heavier than their JS string length", () => {
    // A single emoji has String.length 2 (surrogate pair) but twitter weights it 2.
    const emoji = "😀";
    const weighted = getTweetWeightedLength(emoji);
    expect(weighted).toBe(2);
    // The point: weighted length is NOT derived from a naive char-by-char count
    // of code points (which would be 1 for this emoji).
    expect([...emoji].length).toBe(1);
  });
});

describe("getTweetMaxChars", () => {
  it("caps threads at 280 regardless of tier", () => {
    expect(getTweetMaxChars("Premium", true)).toBe(280);
    expect(getTweetMaxChars(null, true)).toBe(280);
  });

  it("uses tier limit for single posts", () => {
    expect(getTweetMaxChars(null, false)).toBe(280);
    expect(getTweetMaxChars("None", false)).toBe(280);
    expect(getTweetMaxChars("Basic", false)).toBe(2_000);
    expect(getTweetMaxChars("Premium", false)).toBe(2_000);
    expect(getTweetMaxChars("PremiumPlus", false)).toBe(2_000);
  });
});

describe("getTweetLengthZone", () => {
  it("returns null for non-premium contexts", () => {
    expect(getTweetLengthZone(50, false)).toBeNull();
    expect(getTweetLengthZone(500, false)).toBeNull();
  });

  it("classifies short/medium/long for premium single posts at boundaries", () => {
    expect(getTweetLengthZone(0, true)).toBe("short");
    expect(getTweetLengthZone(279, true)).toBe("short");
    expect(getTweetLengthZone(280, true)).toBe("short");
    expect(getTweetLengthZone(281, true)).toBe("medium");
    expect(getTweetLengthZone(1_000, true)).toBe("medium");
    expect(getTweetLengthZone(1_001, true)).toBe("long");
  });
});

describe("getTweetCharSeverity", () => {
  it("classifies ok / warning / over against the 280 max (90% warn)", () => {
    expect(getTweetCharSeverity(0, 280)).toBe("ok");
    // 90% of 280 = 252
    expect(getTweetCharSeverity(251, 280)).toBe("ok");
    expect(getTweetCharSeverity(252, 280)).toBe("warning");
    expect(getTweetCharSeverity(280, 280)).toBe("warning");
    expect(getTweetCharSeverity(281, 280)).toBe("over");
  });

  it("honours a custom warn ratio", () => {
    // 200/280 ≈ 0.714
    const ratio = 200 / 280;
    expect(getTweetCharSeverity(199, 280, ratio)).toBe("ok");
    expect(getTweetCharSeverity(200, 280, ratio)).toBe("warning");
    expect(getTweetCharSeverity(280, 280, ratio)).toBe("warning");
    expect(getTweetCharSeverity(281, 280, ratio)).toBe("over");
  });
});

describe("computeTweetCharCount — boundaries", () => {
  it("0 chars: under all limits, short zone for premium single", () => {
    const c = computeTweetCharCount("", { tier: "Premium" });
    expect(c.charCount).toBe(0);
    expect(c.maxChars).toBe(2_000);
    expect(c.isOverLimit).toBe(false);
    expect(c.isOverStandardLimit).toBe(false);
    expect(c.isPremiumSinglePost).toBe(true);
    expect(c.lengthZone).toBe("short");
    expect(c.severity).toBe("ok");
  });

  it("279 chars on free single post: under standard, ok", () => {
    const c = computeTweetCharCount("a".repeat(279), { tier: null });
    expect(c.charCount).toBe(279);
    expect(c.maxChars).toBe(280);
    expect(c.isOverStandardLimit).toBe(false);
    expect(c.isOverLimit).toBe(false);
    expect(c.severity).toBe("warning"); // 279 >= 252
  });

  it("280 chars on free single post: at limit, not over", () => {
    const c = computeTweetCharCount("a".repeat(280), { tier: null });
    expect(c.charCount).toBe(280);
    expect(c.isOverStandardLimit).toBe(false);
    expect(c.isOverLimit).toBe(false);
    expect(c.severity).toBe("warning");
  });

  it("281 chars on free single post: over standard and over limit", () => {
    const c = computeTweetCharCount("a".repeat(281), { tier: null });
    expect(c.charCount).toBe(281);
    expect(c.isOverStandardLimit).toBe(true);
    expect(c.isOverLimit).toBe(true);
    expect(c.severity).toBe("over");
  });

  it("281 chars in thread mode: capped at 280, over limit", () => {
    const c = computeTweetCharCount("a".repeat(281), { tier: "Premium", isThreadMode: true });
    expect(c.maxChars).toBe(280);
    expect(c.isOverLimit).toBe(true);
    expect(c.isOverStandardLimit).toBe(true);
    expect(c.isPremiumSinglePost).toBe(false);
    expect(c.lengthZone).toBeNull();
  });

  it("281 chars premium single post: within tier limit, medium zone", () => {
    const c = computeTweetCharCount("a".repeat(281), { tier: "Premium" });
    expect(c.maxChars).toBe(2_000);
    expect(c.isOverLimit).toBe(false);
    expect(c.isOverStandardLimit).toBe(true);
    expect(c.lengthZone).toBe("medium");
    expect(c.severity).toBe("ok"); // 281 well under 90% of 2000
  });
});

describe("computeTweetCharCount — tier limits", () => {
  it("free tier single post caps at 280", () => {
    const c = computeTweetCharCount("a".repeat(2_000), { tier: "None" });
    expect(c.maxChars).toBe(280);
    expect(c.isOverLimit).toBe(true);
  });

  it("premium tiers allow up to 2000 single post", () => {
    for (const tier of ["Basic", "Premium", "PremiumPlus"] as const) {
      const c = computeTweetCharCount("a".repeat(2_000), { tier });
      expect(c.maxChars).toBe(2_000);
      expect(c.isOverLimit).toBe(false);
      const over = computeTweetCharCount("a".repeat(2_001), { tier });
      expect(over.isOverLimit).toBe(true);
      expect(over.lengthZone).toBe("long");
    }
  });
});

describe("computeTweetCharCount — weighted vs raw length", () => {
  it("counts a URL as 23 weighted chars, not its raw length", () => {
    const url = "https://example.com/very/long/url/that/exceeds/twenty/three/characters";
    const c = computeTweetCharCount(url, { tier: null });
    expect(c.charCount).toBe(23);
    expect(c.charCount).toBeLessThan(url.length);
  });

  it("respects precomputedCharCount over recomputation", () => {
    const c = computeTweetCharCount("ignored text", {
      isThreadMode: true,
      precomputedCharCount: 300,
    });
    expect(c.charCount).toBe(300);
    expect(c.isOverLimit).toBe(true);
    expect(c.isOverStandardLimit).toBe(true);
  });
});
