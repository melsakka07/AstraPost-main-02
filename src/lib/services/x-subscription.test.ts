import { describe, expect, it } from "vitest";
import { xSubscriptionTierEnum } from "@/lib/schemas/common";
import { canPostLongContent, getMaxCharacterLimit, getTierLabel } from "./x-subscription";

describe("canPostLongContent", () => {
  it("returns false for None tier", () => {
    expect(canPostLongContent("None")).toBe(false);
  });

  it("returns false for null", () => {
    expect(canPostLongContent(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(canPostLongContent(undefined)).toBe(false);
  });

  it("returns true for Basic tier", () => {
    expect(canPostLongContent("Basic")).toBe(true);
  });

  it("returns true for Premium tier", () => {
    expect(canPostLongContent("Premium")).toBe(true);
  });

  it("returns true for PremiumPlus tier", () => {
    expect(canPostLongContent("PremiumPlus")).toBe(true);
  });
});

describe("getMaxCharacterLimit", () => {
  it("returns 280 for None tier", () => {
    expect(getMaxCharacterLimit("None")).toBe(280);
  });

  it("returns 280 for null", () => {
    expect(getMaxCharacterLimit(null)).toBe(280);
  });

  it("returns 280 for undefined", () => {
    expect(getMaxCharacterLimit(undefined)).toBe(280);
  });

  it("returns 25000 for Basic tier", () => {
    expect(getMaxCharacterLimit("Basic")).toBe(25_000);
  });

  it("returns 25000 for Premium tier", () => {
    expect(getMaxCharacterLimit("Premium")).toBe(25_000);
  });

  it("returns 25000 for PremiumPlus tier", () => {
    expect(getMaxCharacterLimit("PremiumPlus")).toBe(25_000);
  });
});

describe("getTierLabel", () => {
  it("returns 'Free X account' for None tier", () => {
    expect(getTierLabel("None")).toBe("Free X account");
  });

  it("returns 'Free X account' for null", () => {
    expect(getTierLabel(null)).toBe("Free X account");
  });

  it("returns 'Free X account' for undefined", () => {
    expect(getTierLabel(undefined)).toBe("Free X account");
  });

  it("returns 'X Basic' for Basic tier", () => {
    expect(getTierLabel("Basic")).toBe("X Basic");
  });

  it("returns 'X Premium' for Premium tier", () => {
    expect(getTierLabel("Premium")).toBe("X Premium");
  });

  it("returns 'X Premium+' for PremiumPlus tier", () => {
    expect(getTierLabel("PremiumPlus")).toBe("X Premium+");
  });
});

describe("xSubscriptionTierEnum", () => {
  it("parses 'None' successfully", () => {
    expect(xSubscriptionTierEnum.parse("None")).toBe("None");
  });

  it("parses 'Basic' successfully", () => {
    expect(xSubscriptionTierEnum.parse("Basic")).toBe("Basic");
  });

  it("parses 'Premium' successfully", () => {
    expect(xSubscriptionTierEnum.parse("Premium")).toBe("Premium");
  });

  it("parses 'PremiumPlus' successfully", () => {
    expect(xSubscriptionTierEnum.parse("PremiumPlus")).toBe("PremiumPlus");
  });

  it("throws ZodError for invalid value 'free'", () => {
    expect(() => xSubscriptionTierEnum.parse("free")).toThrow();
  });

  it("throws ZodError for empty string", () => {
    expect(() => xSubscriptionTierEnum.parse("")).toThrow();
  });

  it("throws ZodError for null", () => {
    expect(() => xSubscriptionTierEnum.parse(null)).toThrow();
  });

  it("throws ZodError for lowercase 'premium'", () => {
    expect(() => xSubscriptionTierEnum.parse("premium")).toThrow();
  });
});
