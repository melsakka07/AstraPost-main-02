import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new XApiService("fake-token");
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
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
    const mediaId = "media-123";

    // Mock the three v2 chunked upload steps: initialize → append → finalize
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: mediaId, media_key: "key", expires_after_secs: 86400 } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: mediaId } }),
      } as Response);

    const buffer = Buffer.from("fake-image");
    const result = await service.uploadMedia(buffer, "image/png");

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    expect(result).toBe(mediaId);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]![0]).toContain("media/upload/initialize");
    expect(fetchMock.mock.calls[1]![0]).toContain(`media/upload/${mediaId}/append`);
    expect(fetchMock.mock.calls[2]![0]).toContain(`media/upload/${mediaId}/finalize`);
  });
});

describe("XApiService.getSubscriptionTier", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns 'Premium' when API returns subscription_type: 'Premium'", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { id: "123", subscription_type: "Premium" },
      }),
    });

    const service = new XApiService("test-token");
    const tier = await service.getSubscriptionTier();

    expect(tier).toBe("Premium");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.twitter.com/2/users/me?user.fields=subscription_type",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("returns 'None' when subscription_type is missing", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { id: "123" },
      }),
    });

    const service = new XApiService("test-token");
    const tier = await service.getSubscriptionTier();

    expect(tier).toBe("None");
  });

  it("returns 'None' when subscription_type is null", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { id: "123", subscription_type: null },
      }),
    });

    const service = new XApiService("test-token");
    const tier = await service.getSubscriptionTier();

    expect(tier).toBe("None");
  });

  it("returns 'Basic' when API returns subscription_type: 'Basic'", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { id: "123", subscription_type: "Basic" },
      }),
    });

    const service = new XApiService("test-token");
    const tier = await service.getSubscriptionTier();

    expect(tier).toBe("Basic");
  });

  it("returns 'PremiumPlus' when API returns subscription_type: 'PremiumPlus'", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { id: "123", subscription_type: "PremiumPlus" },
      }),
    });

    const service = new XApiService("test-token");
    const tier = await service.getSubscriptionTier();

    expect(tier).toBe("PremiumPlus");
  });

  it("throws 'X_SESSION_EXPIRED' on 401 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const service = new XApiService("test-token");

    await expect(service.getSubscriptionTier()).rejects.toThrow("X_SESSION_EXPIRED");
  });

  it("throws 'X_RATE_LIMITED' on 429 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "Rate limited",
    });

    const service = new XApiService("test-token");

    await expect(service.getSubscriptionTier()).rejects.toThrow("X_RATE_LIMITED");
  });

  it("throws generic error on other HTTP errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    const service = new XApiService("test-token");

    await expect(service.getSubscriptionTier()).rejects.toThrow("X_API_ERROR:500");
  });
});
