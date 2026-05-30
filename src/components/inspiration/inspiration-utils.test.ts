import { describe, expect, it } from "vitest";
import { isValidTweetUrl } from "./inspiration-utils";

describe("isValidTweetUrl", () => {
  it("accepts canonical x.com status URLs", () => {
    expect(isValidTweetUrl("https://x.com/jack/status/20")).toBe(true);
  });

  it("accepts twitter.com status URLs", () => {
    expect(isValidTweetUrl("https://twitter.com/jack/status/1234567890")).toBe(true);
  });

  it("accepts mobile.twitter.com status URLs", () => {
    expect(isValidTweetUrl("https://mobile.twitter.com/user/status/999")).toBe(true);
  });

  it("accepts the x.com/i/web/status form", () => {
    expect(isValidTweetUrl("https://x.com/i/web/status/1810000000000000000")).toBe(true);
  });

  it("accepts URLs with query strings and trailing path segments", () => {
    expect(isValidTweetUrl("https://x.com/jack/status/20?s=20&t=abc")).toBe(true);
    expect(isValidTweetUrl("https://x.com/jack/status/20/photo/1")).toBe(true);
  });

  it("is case-insensitive on the host", () => {
    expect(isValidTweetUrl("https://X.COM/jack/status/20")).toBe(true);
  });

  it("rejects profile URLs without a status id", () => {
    expect(isValidTweetUrl("https://x.com/jack")).toBe(false);
  });

  it("rejects status URLs with a non-numeric id", () => {
    expect(isValidTweetUrl("https://x.com/jack/status/abc")).toBe(false);
  });

  it("rejects unrelated and empty URLs", () => {
    expect(isValidTweetUrl("https://example.com/jack/status/20")).toBe(false);
    expect(isValidTweetUrl("not a url")).toBe(false);
    expect(isValidTweetUrl("")).toBe(false);
  });
});
