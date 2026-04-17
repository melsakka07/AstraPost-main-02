import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { XApiService } from "./x-api";

// Mock TwitterApi
const mockTweet = vi.fn();
const mockUploadMedia = vi.fn();
const mockRefreshOAuth2Token = vi.fn();

vi.mock("twitter-api-v2", () => {
  return {
    TwitterApi: vi.fn(function () {
      return {
        v2: {
          tweet: mockTweet,
        },
        v1: {
          uploadMedia: mockUploadMedia,
        },
        refreshOAuth2Token: mockRefreshOAuth2Token,
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
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
    transaction: vi.fn(async (cb) => {
      await cb({
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(undefined),
          })),
        })),
      });
    }),
  },
}));

vi.mock("@/lib/security/token-encryption", () => ({
  encryptToken: vi.fn((token) => `encrypted_${token}`),
  decryptToken: vi.fn((token) => token.replace("encrypted_", "")),
}));

vi.mock("@/lib/rate-limiter", () => ({
  redis: {
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
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

    const tweets = [{ text: "Tweet 1" }, { text: "Tweet 2" }];

    const result = await service.postThread(tweets);

    expect(mockTweet).toHaveBeenCalledTimes(2);
    expect(mockTweet).toHaveBeenNthCalledWith(1, "Tweet 1", { media: undefined, reply: undefined });
    expect(mockTweet).toHaveBeenNthCalledWith(2, "Tweet 2", {
      media: undefined,
      reply: { in_reply_to_tweet_id: "1" },
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("1");
    expect(result[1]!.id).toBe("2");
  });

  it("should upload media", async () => {
    const mediaId = "media-123";

    // Mock the three v2 chunked upload steps: initialize → append → finalize
    global.fetch = vi
      .fn()
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

describe("XApiService token refresh", async () => {
  const { db } = await import("@/lib/db");
  const { redis } = await import("@/lib/rate-limiter");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should refresh token with lock when shouldRefresh is true", async () => {
    const expiredAccount = {
      id: "acc_1",
      userId: "user_1",
      accessTokenEnc: "encrypted_old_access",
      refreshTokenEnc: "encrypted_old_refresh",
      tokenExpiresAt: new Date(Date.now() - 1000), // Expired
    };

    (db.query.xAccounts.findFirst as any).mockResolvedValue(expiredAccount);
    (redis.set as any).mockResolvedValue("OK");
    mockRefreshOAuth2Token.mockResolvedValue({
      accessToken: "new_access",
      refreshToken: "new_refresh",
      expiresIn: 7200,
    });

    const client = await XApiService.getClientForUser("user_1");

    expect(client).toBeDefined();
    expect(redis.set).toHaveBeenCalledWith(`x:token_refresh_lock:acc_1`, "1", "EX", 30, "NX");
    expect(mockRefreshOAuth2Token).toHaveBeenCalledWith("old_refresh");
    expect(db.transaction).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith(`x:token_refresh_lock:acc_1`);
  });

  it("should wait for lock and re-read DB if lock is held", async () => {
    const expiredAccount = {
      id: "acc_1",
      userId: "user_1",
      accessTokenEnc: "encrypted_old_access",
      refreshTokenEnc: "encrypted_old_refresh",
      tokenExpiresAt: new Date(Date.now() - 1000),
    };

    const refreshedAccount = {
      ...expiredAccount,
      accessTokenEnc: "encrypted_new_access",
      tokenExpiresAt: new Date(Date.now() + 7200 * 1000),
    };

    // First call gets expired account
    (db.query.xAccounts.findFirst as any)
      .mockResolvedValueOnce(expiredAccount)
      // Second call (after wait) gets refreshed account
      .mockResolvedValueOnce(refreshedAccount);

    // Simulate lock already held
    (redis.set as any).mockResolvedValue(null);

    const startTime = Date.now();
    const client = await XApiService.getClientForUser("user_1");
    const duration = Date.now() - startTime;

    expect(client).toBeDefined();
    // Verify it waited ~1.5s
    expect(duration).toBeGreaterThanOrEqual(1400);
    // Verify it didn't try to refresh itself
    expect(mockRefreshOAuth2Token).not.toHaveBeenCalled();
    // Verify it didn't try to delete the lock it didn't own
    expect(redis.del).not.toHaveBeenCalled();
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
