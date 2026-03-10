import { describe, it, expect, vi, beforeEach } from "vitest";
import { XApiService } from "./x-api";

// Mock TwitterApi
const mockTweet = vi.fn();
const mockUploadMedia = vi.fn();

vi.mock("twitter-api-v2", () => {
  return {
    TwitterApi: vi.fn(function() {
      return {
        v2: {
          tweet: mockTweet,
        },
        v1: {
          uploadMedia: mockUploadMedia,
        },
      };
    }),
  };
});

// Mock db to avoid side effects
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      xAccounts: {
        findFirst: vi.fn(),
      },
    },
  },
}));

describe("XApiService", () => {
  let service: XApiService;

  beforeEach(() => {
    service = new XApiService("fake-token");
    vi.clearAllMocks();
  });

  it("should post a single tweet", async () => {
    mockTweet.mockResolvedValue({ data: { id: "123" } });
    await service.postTweet("Hello World");
    expect(mockTweet).toHaveBeenCalledWith("Hello World");
  });

  it("should post a tweet with media", async () => {
    mockTweet.mockResolvedValue({ data: { id: "123" } });
    await service.postTweet("Hello World", ["media1"]);
    expect(mockTweet).toHaveBeenCalledWith("Hello World", { media: { media_ids: ["media1"] } });
  });

  it("should post a thread", async () => {
    mockTweet.mockResolvedValueOnce({ data: { id: "1" } });
    mockTweet.mockResolvedValueOnce({ data: { id: "2" } });

    const tweets = [
      { text: "Tweet 1" },
      { text: "Tweet 2" },
    ];

    const result = await service.postThread(tweets);

    expect(mockTweet).toHaveBeenCalledTimes(2);
    expect(mockTweet).toHaveBeenNthCalledWith(1, "Tweet 1", { media: undefined, reply: undefined });
    expect(mockTweet).toHaveBeenNthCalledWith(2, "Tweet 2", { media: undefined, reply: { in_reply_to_tweet_id: "1" } });
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("1");
    expect(result[1]!.id).toBe("2");
  });

  it("should upload media", async () => {
    mockUploadMedia.mockResolvedValue({ media_id_string: "123" });
    const buffer = Buffer.from("fake-image");
    await service.uploadMedia(buffer, "image/png");
    expect(mockUploadMedia).toHaveBeenCalledWith(buffer, { mimeType: "image/png" });
  });
});
