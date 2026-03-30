import { describe, expect, it } from "vitest";
import { getMaxCharacterLimit } from "./services/x-subscription";
import {
  AI_LENGTH_OPTIONS,
  getAvailableLengthOptions,
  isLengthOptionAllowed,
} from "./x-post-length";

describe("AI_LENGTH_OPTIONS", () => {
  it("defines short option with correct properties", () => {
    expect(AI_LENGTH_OPTIONS.short).toEqual({
      id: "short",
      label: "Short",
      description: "Punchy, high-engagement tweet",
      maxChars: 280,
      minChars: 1,
      requiresPremium: false,
    });
  });

  it("defines medium option with correct properties", () => {
    expect(AI_LENGTH_OPTIONS.medium).toEqual({
      id: "medium",
      label: "Medium",
      description: "Nuanced take, mini-essay, or detailed opinion",
      maxChars: 1_000,
      minChars: 281,
      requiresPremium: true,
    });
  });

  it("defines long option with correct properties", () => {
    expect(AI_LENGTH_OPTIONS.long).toEqual({
      id: "long",
      label: "Long",
      description: "Thought leadership, in-depth analysis, or storytelling",
      maxChars: 2_000,
      minChars: 1_001,
      requiresPremium: true,
    });
  });

  it("has short option that does not require premium", () => {
    expect(AI_LENGTH_OPTIONS.short.requiresPremium).toBe(false);
  });

  it("has medium option that requires premium", () => {
    expect(AI_LENGTH_OPTIONS.medium.requiresPremium).toBe(true);
  });

  it("has long option that requires premium", () => {
    expect(AI_LENGTH_OPTIONS.long.requiresPremium).toBe(true);
  });
});

describe("getAvailableLengthOptions", () => {
  it("returns only short option for None tier", () => {
    const options = getAvailableLengthOptions("None");
    expect(options).toHaveLength(1);
    expect(options[0]!.id).toBe("short");
  });

  it("returns only short option for null tier", () => {
    const options = getAvailableLengthOptions(null);
    expect(options).toHaveLength(1);
    expect(options[0]!.id).toBe("short");
  });

  it("returns all three options for Basic tier", () => {
    const options = getAvailableLengthOptions("Basic");
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.id)).toEqual(["short", "medium", "long"]);
  });

  it("returns all three options for Premium tier", () => {
    const options = getAvailableLengthOptions("Premium");
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.id)).toEqual(["short", "medium", "long"]);
  });

  it("returns all three options for PremiumPlus tier", () => {
    const options = getAvailableLengthOptions("PremiumPlus");
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.id)).toEqual(["short", "medium", "long"]);
  });
});

describe("getMaxCharacterLimit", () => {
  it("returns 280 for None tier", () => {
    expect(getMaxCharacterLimit("None")).toBe(280);
  });

  it("returns 280 for null tier", () => {
    expect(getMaxCharacterLimit(null)).toBe(280);
  });

  it("returns 2_000 for Basic tier", () => {
    expect(getMaxCharacterLimit("Basic")).toBe(2_000);
  });

  it("returns 2_000 for Premium tier", () => {
    expect(getMaxCharacterLimit("Premium")).toBe(2_000);
  });

  it("returns 2_000 for PremiumPlus tier", () => {
    expect(getMaxCharacterLimit("PremiumPlus")).toBe(2_000);
  });
});

describe("isLengthOptionAllowed", () => {
  describe("short option", () => {
    it("is allowed for None tier", () => {
      expect(isLengthOptionAllowed("short", "None")).toBe(true);
    });

    it("is allowed for null tier", () => {
      expect(isLengthOptionAllowed("short", null)).toBe(true);
    });

    it("is allowed for Basic tier", () => {
      expect(isLengthOptionAllowed("short", "Basic")).toBe(true);
    });

    it("is allowed for Premium tier", () => {
      expect(isLengthOptionAllowed("short", "Premium")).toBe(true);
    });

    it("is allowed for PremiumPlus tier", () => {
      expect(isLengthOptionAllowed("short", "PremiumPlus")).toBe(true);
    });
  });

  describe("medium option", () => {
    it("is not allowed for None tier", () => {
      expect(isLengthOptionAllowed("medium", "None")).toBe(false);
    });

    it("is not allowed for null tier", () => {
      expect(isLengthOptionAllowed("medium", null)).toBe(false);
    });

    it("is allowed for Basic tier", () => {
      expect(isLengthOptionAllowed("medium", "Basic")).toBe(true);
    });

    it("is allowed for Premium tier", () => {
      expect(isLengthOptionAllowed("medium", "Premium")).toBe(true);
    });

    it("is allowed for PremiumPlus tier", () => {
      expect(isLengthOptionAllowed("medium", "PremiumPlus")).toBe(true);
    });
  });

  describe("long option", () => {
    it("is not allowed for None tier", () => {
      expect(isLengthOptionAllowed("long", "None")).toBe(false);
    });

    it("is not allowed for null tier", () => {
      expect(isLengthOptionAllowed("long", null)).toBe(false);
    });

    it("is allowed for Basic tier", () => {
      expect(isLengthOptionAllowed("long", "Basic")).toBe(true);
    });

    it("is allowed for Premium tier", () => {
      expect(isLengthOptionAllowed("long", "Premium")).toBe(true);
    });

    it("is allowed for PremiumPlus tier", () => {
      expect(isLengthOptionAllowed("long", "PremiumPlus")).toBe(true);
    });
  });
});
