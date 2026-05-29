import { describe, expect, it } from "vitest";
import {
  applyNumbering,
  detectTranslateTarget,
  draftsHaveContent,
  isThreadNumbered,
  removeNumbering,
  serializeDraftsForSave,
} from "./composer-utils";
import type { TweetDraft } from "./composer-types";

function draft(id: string, content: string, media: TweetDraft["media"] = []): TweetDraft {
  return { id, content, media };
}

describe("applyNumbering", () => {
  it("prefixes each tweet with its position over the total", () => {
    const result = applyNumbering([draft("1", "alpha"), draft("2", "beta"), draft("3", "gamma")]);
    expect(result.map((t) => t.content)).toEqual(["1/3 alpha", "2/3 beta", "3/3 gamma"]);
  });

  it("strips an existing prefix before re-applying (idempotent)", () => {
    const once = applyNumbering([draft("1", "alpha"), draft("2", "beta")]);
    const twice = applyNumbering(once);
    expect(twice.map((t) => t.content)).toEqual(["1/2 alpha", "2/2 beta"]);
  });

  it("re-numbers correctly when the total changes", () => {
    const three = applyNumbering([draft("1", "a"), draft("2", "b"), draft("3", "c")]);
    const two = applyNumbering(three.slice(0, 2));
    expect(two.map((t) => t.content)).toEqual(["1/2 a", "2/2 b"]);
  });

  it("truncates content so the prefixed string stays within the 1000-char cap", () => {
    const long = "x".repeat(1200);
    const [result] = applyNumbering([draft("1", long), draft("2", "b")]);
    const prefix = "1/2 ";
    expect(result!.content.length).toBe(1000);
    expect(result!.content.startsWith(prefix)).toBe(true);
  });

  it("preserves media and id", () => {
    const media: TweetDraft["media"] = [
      { url: "u", mimeType: "image/png", fileType: "image", size: 1 },
    ];
    const [result] = applyNumbering([draft("abc", "hi", media)]);
    expect(result!.id).toBe("abc");
    expect(result!.media).toEqual(media);
  });
});

describe("removeNumbering", () => {
  it("removes the leading N/M prefix", () => {
    const result = removeNumbering([draft("1", "1/3 alpha"), draft("2", "2/3 beta")]);
    expect(result.map((t) => t.content)).toEqual(["alpha", "beta"]);
  });

  it("leaves un-prefixed content untouched", () => {
    const result = removeNumbering([draft("1", "no prefix here")]);
    expect(result[0]!.content).toBe("no prefix here");
  });
});

describe("isThreadNumbered", () => {
  it("is false for a single tweet even when prefixed", () => {
    expect(isThreadNumbered([draft("1", "1/1 alpha")])).toBe(false);
  });

  it("is true when every tweet in a thread is prefixed", () => {
    expect(isThreadNumbered([draft("1", "1/2 a"), draft("2", "2/2 b")])).toBe(true);
  });

  it("is false when any tweet is missing the prefix", () => {
    expect(isThreadNumbered([draft("1", "1/2 a"), draft("2", "b")])).toBe(false);
  });
});

describe("detectTranslateTarget", () => {
  it("suggests English for Arabic-dominant content", () => {
    expect(detectTranslateTarget("مرحبا بالعالم", "ar")).toBe("en");
  });

  it("suggests Arabic for Latin-only content", () => {
    expect(detectTranslateTarget("hello world", "en")).toBe("ar");
  });

  it("falls back to the opposite of the current language when ambiguous", () => {
    expect(detectTranslateTarget("12345 !@#", "ar")).toBe("en");
    expect(detectTranslateTarget("", "en")).toBe("ar");
  });
});

describe("serializeDraftsForSave", () => {
  it("drops media still uploading", () => {
    const media: TweetDraft["media"] = [
      { url: "done", mimeType: "image/png", fileType: "image", size: 1 },
      { url: "", mimeType: "image/png", fileType: "image", size: 2, uploading: true },
    ];
    const [result] = serializeDraftsForSave([draft("1", "hi", media)]);
    expect(result!.media).toHaveLength(1);
    expect(result!.media[0]!.url).toBe("done");
  });
});

describe("draftsHaveContent", () => {
  it("is false for a single empty tweet", () => {
    expect(draftsHaveContent([draft("1", "   ")])).toBe(false);
  });

  it("is true when text is present", () => {
    expect(draftsHaveContent([draft("1", "hi")])).toBe(true);
  });

  it("is true when media is attached even without text", () => {
    const media: TweetDraft["media"] = [
      { url: "u", mimeType: "image/png", fileType: "image", size: 1 },
    ];
    expect(draftsHaveContent([draft("1", "", media)])).toBe(true);
  });
});
