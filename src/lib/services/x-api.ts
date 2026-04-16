import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { TwitterApi } from "twitter-api-v2";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/rate-limiter";
import { xAccounts } from "@/lib/schema";
import { decryptToken, encryptToken } from "@/lib/security/token-encryption";

// ── Constants ──────────────────────────────────────────────────────────────────
const CHUNK_SIZE = 1 * 1024 * 1024; // 1 MB per chunk
const MAX_POLL_ATTEMPTS = 30;

/**
 * TTL for the per-account token-refresh distributed lock (seconds).
 * X token refresh typically completes in <3 s. 30 s is a safety net so the
 * lock auto-expires if the worker holding it is killed mid-refresh.
 */
const REFRESH_LOCK_TTL_SECS = 30;

/**
 * How long a worker that lost the lock race waits before re-reading the
 * freshly-written token from the DB.
 */
const REFRESH_LOCK_WAIT_MS = 1_500;

type MediaCategory = "tweet_image" | "tweet_gif" | "tweet_video" | "amplify_video";

/**
 * Minimal shape required to perform a token refresh.
 * Both getClientForUser and getClientForAccountId produce rows that satisfy
 * this type, so the shared refreshWithLock helper can accept either.
 */
type RefreshableAccount = {
  id: string;
  userId: string;
  accessToken: string;
  refreshTokenEnc: string | null;
  tokenExpiresAt: Date | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Builds a raw multipart/form-data Buffer for the APPEND step.
// segment_index must be a text field; media must be raw binary.
function buildMultipartBody(boundary: string, chunk: Buffer, segmentIndex: number): Buffer {
  const CRLF = "\r\n";
  const enc = new TextEncoder();

  const partHeader =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="segment_index"${CRLF}${CRLF}` +
    `${segmentIndex}${CRLF}` +
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="media"; filename="chunk"${CRLF}` +
    `Content-Type: application/octet-stream${CRLF}${CRLF}`;

  const partFooter = `${CRLF}--${boundary}--${CRLF}`;

  return Buffer.concat([
    Buffer.from(enc.encode(partHeader)),
    chunk,
    Buffer.from(enc.encode(partFooter)),
  ]);
}

// ── Service Class ──────────────────────────────────────────────────────────────
export class XApiService {
  private client: TwitterApi;
  private accessToken: string;

  constructor(token: string) {
    this.accessToken = token;
    this.client = new TwitterApi(token);
  }

  /**
   * Refresh the OAuth 2.0 access token for `account` under a per-account
   * Redis distributed lock.
   *
   * ## Why a lock is necessary
   * X's PKCE refresh tokens are **single-use**. With BullMQ concurrency > 1
   * or multiple worker processes, two workers can simultaneously read
   * `shouldRefresh = true` for the same account, both call the X refresh
   * endpoint with the identical refresh token, and the provider invalidates
   * the first worker's new access token the moment the second call succeeds.
   * The result is a hard 401 that cannot be retried without user interaction.
   *
   * ## Lock strategy
   * - **Acquired**:     Perform the refresh, persist new tokens to DB, then
   *                     release the lock in `finally`.
   * - **Not acquired**: Another worker is already refreshing — wait
   *                     `REFRESH_LOCK_WAIT_MS` ms, re-read the account row
   *                     (which now contains the freshly-written token), and
   *                     return an `XApiService` backed by that token.
   * - **Redis down**:   Log a warning and fall through to refresh without the
   *                     lock. This preserves single-worker functionality during
   *                     a Redis outage — the data hazard is the lesser evil.
   */
  private static async refreshWithLock(
    account: RefreshableAccount,
    userId: string
  ): Promise<XApiService> {
    const lockKey = `x:token_refresh_lock:${account.id}`;

    // Attempt to acquire the lock. Returns "OK" on success, null if already held.
    let lockResult: string | null = null;
    let redisAvailable = true;
    try {
      lockResult = await redis.set(lockKey, "1", "EX", REFRESH_LOCK_TTL_SECS, "NX");
    } catch (redisError) {
      redisAvailable = false;
      logger.warn("x_token_refresh_lock_redis_unavailable", {
        xAccountId: account.id,
        userId,
        error: redisError instanceof Error ? redisError.message : String(redisError),
        action: "falling_through_without_lock",
      });
    }

    const lockAcquired = !redisAvailable || lockResult === "OK";

    if (!lockAcquired) {
      // Another worker holds the lock — wait for it to complete, then use
      // the freshly-written token from the DB.
      logger.info("x_token_refresh_lock_contended", {
        xAccountId: account.id,
        userId,
        waitMs: REFRESH_LOCK_WAIT_MS,
      });

      await sleep(REFRESH_LOCK_WAIT_MS);

      const freshAccount = await db.query.xAccounts.findFirst({
        where: eq(xAccounts.id, account.id),
      });

      if (!freshAccount) {
        throw new Error(`X account ${account.id} not found after waiting for refresh lock.`);
      }

      return new XApiService(decryptToken(freshAccount.accessToken));
    }

    // We hold the lock (or Redis is unavailable). Perform the refresh and
    // release in `finally` so the lock is never left dangling on error.
    try {
      logger.info("x_token_refresh_start", { xAccountId: account.id, userId });

      const refreshTokenValue = decryptToken(account.refreshTokenEnc!);
      const twitterClient = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID!,
        clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      });

      const { accessToken, refreshToken, expiresIn } =
        await twitterClient.refreshOAuth2Token(refreshTokenValue);

      if (refreshToken) {
        const fingerprint = crypto.createHash("sha256").update(refreshToken).digest("hex");
        logger.info("x_refresh_token_received", { xAccountId: account.id, fingerprint });
      }

      // expiresIn is optional in the twitter-api-v2 types; fall back to 2 h
      // so tokenExpiresAt is never null/NaN after a successful refresh (which
      // would cause every subsequent job to try to refresh again, burning the
      // single-use refresh token and causing a 400 on the second attempt).
      const newExpiresAt = new Date(Date.now() + (expiresIn ?? 7200) * 1000);

      await db.transaction(async (tx) => {
        await tx
          .update(xAccounts)
          .set({
            accessToken: encryptToken(accessToken),
            refreshTokenEnc: refreshToken ? encryptToken(refreshToken) : account.refreshTokenEnc,
            tokenExpiresAt: newExpiresAt,
          })
          .where(eq(xAccounts.id, account.id));
      });

      logger.info("x_token_refresh_success", { xAccountId: account.id, userId });
      return new XApiService(accessToken);
    } catch (error) {
      logger.warn("x_token_refresh_failed", {
        xAccountId: account.id,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("X Session expired. Please reconnect your account.");
    } finally {
      if (redisAvailable) {
        try {
          await redis.del(lockKey);
        } catch {
          // Lock will auto-expire via TTL — safe to swallow
        }
      }
    }
  }

  static async getClientForUser(userId: string): Promise<XApiService | null> {
    const account = await db.query.xAccounts.findFirst({
      where: and(eq(xAccounts.userId, userId), eq(xAccounts.isActive, true)),
      orderBy: (t, { desc, asc }) => [desc(t.isDefault), asc(t.createdAt)],
    });

    if (!account) return null;

    const shouldRefresh =
      !!account.refreshTokenEnc &&
      (!account.tokenExpiresAt || account.tokenExpiresAt.getTime() - Date.now() < 60_000);

    if (shouldRefresh) {
      return XApiService.refreshWithLock(account, userId);
    }

    return new XApiService(decryptToken(account.accessToken));
  }

  static async getClientForAccountId(accountId: string): Promise<XApiService | null> {
    const account = await db.query.xAccounts.findFirst({
      where: eq(xAccounts.id, accountId),
    });

    if (!account) return null;

    const shouldRefresh =
      !!account.refreshTokenEnc &&
      (!account.tokenExpiresAt || account.tokenExpiresAt.getTime() - Date.now() < 60_000);

    if (shouldRefresh) {
      return XApiService.refreshWithLock(account, account.userId);
    }

    return new XApiService(decryptToken(account.accessToken));
  }

  async postTweet(text: string, mediaIds?: string[]) {
    try {
      if (mediaIds && mediaIds.length > 0) {
        const limitedMediaIds = mediaIds.slice(0, 4);
        const response = await this.client.v2.tweet(text, {
          media: { media_ids: limitedMediaIds as any },
        });
        logger.info("x_tweet_posted", { tweetId: response?.data?.id, hasMedia: true });
        return response;
      }
      const response = await this.client.v2.tweet(text);
      logger.info("x_tweet_posted", { tweetId: response?.data?.id, hasMedia: false });
      return response;
    } catch (error) {
      const apiError = error as any;
      logger.error("x_tweet_post_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        code: apiError?.code,
        xApiErrors: apiError?.data?.errors ?? apiError?.data ?? null,
      });
      throw error;
    }
  }

  async postTweetReply(text: string, replyToTweetId: string, mediaIds?: string[]) {
    try {
      const limitedMediaIds = mediaIds?.slice(0, 4);

      const response = await this.client.v2.tweet(text, {
        ...(limitedMediaIds && limitedMediaIds.length > 0
          ? { media: { media_ids: limitedMediaIds as any } }
          : {}),
        reply: { in_reply_to_tweet_id: replyToTweetId },
      });

      logger.info("x_tweet_reply_posted", { tweetId: response?.data?.id, replyToTweetId });
      return response;
    } catch (error) {
      const apiError = error as any;
      logger.error("x_tweet_reply_post_failed", {
        replyToTweetId,
        error: error instanceof Error ? error.message : "Unknown error",
        code: apiError?.code,
        xApiErrors: apiError?.data?.errors ?? apiError?.data ?? null,
      });
      throw error;
    }
  }

  async postThread(tweets: { text: string; mediaIds?: string[] }[]) {
    try {
      let lastTweetId: string | undefined;
      const postedTweets = [];

      for (const tweet of tweets) {
        const params: any = { text: tweet.text };
        if (tweet.mediaIds && tweet.mediaIds.length > 0) {
          params.media = { media_ids: tweet.mediaIds.slice(0, 4) as any };
        }

        if (lastTweetId) {
          params.reply = { in_reply_to_tweet_id: lastTweetId };
        }

        const result = await this.client.v2.tweet(params.text, {
          media: params.media,
          reply: params.reply,
        });

        lastTweetId = result.data.id;
        postedTweets.push(result.data);
      }

      return postedTweets;
    } catch (error) {
      logger.error("x_thread_post_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  // ── PUBLIC: Upload media via new X API v2 dedicated endpoints ──────────────
  // Requires OAuth 2.0 user token with `media.write` scope.
  // Replaces the DEAD v1.1 upload.twitter.com endpoint (sunset June 9 2025).
  async uploadMedia(
    fileBuffer: Buffer,
    mimeType: string,
    options?: { mediaCategory?: MediaCategory }
  ): Promise<string> {
    const totalBytes = fileBuffer.byteLength;
    const mediaCategory = options?.mediaCategory ?? this.inferCategory(mimeType);

    // ── INIT ────────────────────────────────────────────────────────────────
    const initData = await this.jsonRequest<{
      data: { id: string; media_key: string; expires_after_secs: number };
    }>("POST", "https://api.x.com/2/media/upload/initialize", {
      media_type: mimeType,
      media_category: mediaCategory,
      total_bytes: totalBytes,
    });

    const mediaId = initData.data.id;
    logger.info("x_media_upload_initialized", { mediaId, mediaCategory, totalBytes });

    // ── APPEND (chunked) ────────────────────────────────────────────────────
    const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const chunk = fileBuffer.subarray(start, start + CHUNK_SIZE);

      // Build multipart/form-data manually so we control the binary boundary
      // DO NOT use JSON for append — the API expects multipart with raw bytes
      const boundary = `----XApiBoundary${Date.now()}${i}`;
      const body = buildMultipartBody(boundary, chunk, i);

      const appendRes = await fetch(`https://api.x.com/2/media/upload/${mediaId}/append`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: body as unknown as BodyInit,
      });

      if (!appendRes.ok && appendRes.status !== 204) {
        const errText = await appendRes.text().catch(() => "(empty)");
        logger.error("x_media_upload_append_failed", {
          chunk: i,
          status: appendRes.status,
          error: errText,
        });
        throw new Error(`[XApi] APPEND chunk ${i} failed: HTTP ${appendRes.status} — ${errText}`);
      }

      logger.debug("x_media_upload_chunk_appended", { mediaId, chunk: i + 1, total: totalChunks });
    }

    logger.info("x_media_upload_chunks_complete", { mediaId, totalChunks });

    // ── FINALIZE ────────────────────────────────────────────────────────────
    const finalizeData = await this.jsonRequest<{
      data: {
        id: string;
        media_key: string;
        size: number;
        expires_after_secs: number;
        processing_info?: {
          state: "pending" | "in_progress" | "succeeded" | "failed";
          check_after_secs?: number;
          error?: { code: number; name: string; message: string };
        };
      };
    }>("POST", `https://api.x.com/2/media/upload/${mediaId}/finalize`, {});

    logger.info("x_media_upload_finalized", { mediaId });

    // ── STATUS POLL (video / gif only) ──────────────────────────────────────
    if (finalizeData.data.processing_info) {
      const waitSecs = finalizeData.data.processing_info.check_after_secs ?? 1;
      await this.pollUntilReady(mediaId, waitSecs);
    }

    return finalizeData.data.id;
  }

  async getUser() {
    return await this.client.v2.me({ "user.fields": ["profile_image_url", "username", "name"] });
  }

  async getFollowerCount() {
    const res = await this.client.v2.me({ "user.fields": ["public_metrics"] } as any);
    const count = (res as any)?.data?.public_metrics?.followers_count;
    if (typeof count !== "number") {
      throw new Error("Failed to fetch follower count");
    }
    return count;
  }

  async getSubscriptionTier(): Promise<string> {
    const res = await fetch("https://api.twitter.com/2/users/me?user.fields=subscription_type", {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "(empty)");
      logger.error("x_subscription_tier_fetch_failed", {
        status: res.status,
        body: errText,
      });

      if (res.status === 401) {
        throw new Error("X_SESSION_EXPIRED");
      }
      if (res.status === 429) {
        throw new Error("X_RATE_LIMITED");
      }
      throw new Error(`X_API_ERROR:${res.status}`);
    }

    const data = (await res.json()) as {
      data?: { subscription_type?: string };
    };

    const tier = data?.data?.subscription_type ?? "None";
    return tier;
  }

  static async fetchXSubscriptionTier(accountId: string): Promise<string> {
    const account = await db.query.xAccounts.findFirst({
      where: eq(xAccounts.id, accountId),
    });

    if (!account) {
      throw new Error(`X account ${accountId} not found`);
    }

    const shouldRefresh =
      !!account.refreshTokenEnc &&
      (!account.tokenExpiresAt || account.tokenExpiresAt.getTime() - Date.now() < 60_000);

    let client: XApiService;
    if (shouldRefresh) {
      client = await XApiService.refreshWithLock(account, account.userId);
    } else {
      client = new XApiService(decryptToken(account.accessToken));
    }

    const tier = await client.getSubscriptionTier();

    await db
      .update(xAccounts)
      .set({
        xSubscriptionTier: tier,
        xSubscriptionTierUpdatedAt: new Date(),
      })
      .where(eq(xAccounts.id, accountId));

    logger.info("x_subscription_tier_updated", {
      xAccountId: accountId,
      tier,
    });

    return tier;
  }

  async getTweetsPublicMetrics(tweetIds: string[]) {
    const ids = tweetIds.filter(Boolean);
    if (ids.length === 0) return [] as any[];
    const response = await (this.client.v2 as any).tweets(ids, {
      "tweet.fields": ["public_metrics"],
    });
    return response?.data || [];
  }

  // ── PRIVATE: Poll GET /2/media/upload/:id until succeeded or failed ────────
  private async pollUntilReady(mediaId: string, initialWaitSecs: number): Promise<void> {
    let waitMs = initialWaitSecs * 1000;
    logger.info("x_media_upload_polling_start", { mediaId });

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(waitMs);

      const statusData = await this.jsonRequest<{
        data: {
          id: string;
          processing_info: {
            state: "pending" | "in_progress" | "succeeded" | "failed";
            check_after_secs?: number;
            progress_percent?: number;
            error?: { code: number; name: string; message: string };
          };
        };
      }>("GET", `https://api.x.com/2/media/upload/${mediaId}`);

      const { state, check_after_secs, progress_percent, error } = statusData.data.processing_info;

      logger.debug("x_media_upload_polling_status", {
        mediaId,
        state,
        progressPercent: progress_percent,
      });

      if (state === "succeeded") {
        logger.info("x_media_upload_processing_complete", { mediaId });
        return;
      }

      if (state === "failed") {
        const errorMsg = error?.message ?? "unknown";
        const errorCode = error?.code;
        throw new Error(`[XApi] Media processing failed: ${errorMsg} (code ${errorCode})`);
      }

      waitMs = (check_after_secs ?? 2) * 1000;
    }

    throw new Error(
      `[XApi] Timed out waiting for media processing after ${MAX_POLL_ATTEMPTS} attempts`
    );
  }

  // ── PRIVATE: JSON POST/GET helper ──────────────────────────────────────────
  private async jsonRequest<T>(
    method: "GET" | "POST",
    url: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: JSON.stringify(body ?? {}) } : {}),
    });

    if (!res.ok) {
      let errBody: string;
      try {
        errBody = JSON.stringify(await res.json());
      } catch {
        errBody = (await res.text()) || "(empty)";
      }
      logger.error("x_api_request_failed", {
        method,
        url,
        status: res.status,
        body: errBody,
      });
      throw new Error(`[XApi] ${method} ${url} → HTTP ${res.status}: ${errBody}`);
    }

    if (res.status === 204) return {} as T;
    return res.json() as Promise<T>;
  }

  // ── PRIVATE: Infer media category from MIME type ───────────────────────────
  private inferCategory(mimeType: string): MediaCategory {
    if (mimeType === "image/gif") return "tweet_gif";
    if (mimeType.startsWith("video/")) return "tweet_video";
    return "tweet_image";
  }
}
