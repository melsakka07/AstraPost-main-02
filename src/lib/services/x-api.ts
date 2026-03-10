import { and, eq } from "drizzle-orm";
import { TwitterApi } from "twitter-api-v2";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { xAccounts } from "@/lib/schema";
import { decryptToken, encryptToken } from "@/lib/security/token-encryption";

export class XApiService {
  private client: TwitterApi;

  constructor(token: string) {
    this.client = new TwitterApi(token);
  }

  static async getClientForUser(userId: string): Promise<XApiService | null> {
    const account = await db.query.xAccounts.findFirst({
      where: and(eq(xAccounts.userId, userId), eq(xAccounts.isActive, true)),
      orderBy: (t, { desc, asc }) => [desc(t.isDefault), asc(t.createdAt)],
    });

    if (!account) {
      return null;
    }

    const expiresAt = account.tokenExpiresAt;
    const refreshTokenValue = account.refreshTokenEnc
      ? decryptToken(account.refreshTokenEnc)
      : account.refreshToken;
    const shouldRefresh =
      !!refreshTokenValue && (!expiresAt || expiresAt.getTime() - Date.now() < 60_000);

    if (shouldRefresh) {
      logger.info("x_token_refresh_start", { xAccountId: account.id, userId });
      try {
        const client = new TwitterApi({
          clientId: process.env.TWITTER_CLIENT_ID!,
          clientSecret: process.env.TWITTER_CLIENT_SECRET!,
        });

        const { accessToken, refreshToken, expiresIn } =
          await client.refreshOAuth2Token(refreshTokenValue!);
        const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

        await db
          .update(xAccounts)
          .set({
            accessToken: encryptToken(accessToken),
            refreshTokenEnc: refreshToken
              ? encryptToken(refreshToken)
              : account.refreshTokenEnc,
            refreshToken: null,
            tokenExpiresAt: newExpiresAt,
          })
          .where(eq(xAccounts.id, account.id));

        logger.info("x_token_refresh_success", { xAccountId: account.id, userId });
        return new XApiService(accessToken);
      } catch (error) {
        logger.warn("x_token_refresh_failed", {
          xAccountId: account.id,
          userId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw new Error("X Session expired. Please reconnect your account.");
      }
    }

    return new XApiService(decryptToken(account.accessToken));
  }

  static async getClientForAccountId(accountId: string): Promise<XApiService | null> {
    const account = await db.query.xAccounts.findFirst({
      where: eq(xAccounts.id, accountId),
    });

    if (!account) {
      return null;
    }

    const expiresAt = account.tokenExpiresAt;
    const refreshTokenValue = account.refreshTokenEnc
      ? decryptToken(account.refreshTokenEnc)
      : account.refreshToken;
    const shouldRefresh =
      !!refreshTokenValue &&
      (!expiresAt || expiresAt.getTime() - Date.now() < 60_000);

    if (shouldRefresh) {
      try {
        const client = new TwitterApi({
          clientId: process.env.TWITTER_CLIENT_ID!,
          clientSecret: process.env.TWITTER_CLIENT_SECRET!,
        });

        const { accessToken, refreshToken, expiresIn } =
          await client.refreshOAuth2Token(refreshTokenValue!);
        const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

        await db
          .update(xAccounts)
          .set({
            accessToken: encryptToken(accessToken),
            refreshTokenEnc: refreshToken ? encryptToken(refreshToken) : account.refreshTokenEnc,
            refreshToken: null,
            tokenExpiresAt: newExpiresAt,
          })
          .where(eq(xAccounts.id, account.id));

        return new XApiService(accessToken);
      } catch (error) {
        logger.warn("x_token_refresh_failed", {
          xAccountId: account.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw new Error("X Session expired. Please reconnect your account.");
      }
    }

    return new XApiService(decryptToken(account.accessToken));
  }

  async postTweet(text: string, mediaIds?: string[]) {
    try {
      if (mediaIds && mediaIds.length > 0) {
        const limitedMediaIds = mediaIds.slice(0, 4);
        const response = await this.client.v2.tweet(text, { media: { media_ids: limitedMediaIds as any } });
        logger.info("x_tweet_posted", { tweetId: response?.data?.id, hasMedia: true });
        return response;
      }
      const response = await this.client.v2.tweet(text);
      logger.info("x_tweet_posted", { tweetId: response?.data?.id, hasMedia: false });
      return response;
    } catch (error) {
      logger.error("x_tweet_post_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
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
      logger.error("x_tweet_reply_post_failed", {
        replyToTweetId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async postThread(tweets: { text: string; mediaIds?: string[] }[]) {
    try {
      // Twitter API v2 supports threading by replying to the previous tweet ID.
      // However, the `tweetThread` helper is available in v1.1 or needs manual chaining in v2.
      // Let's implement manual chaining for v2.
      
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
            reply: params.reply 
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

  async uploadMedia(fileBuffer: Buffer, mimeType: string, options?: { mediaCategory?: string }) {
    try {
      // Twitter API v1.1 is required for media upload
      const payload: any = { mimeType };
      if (options?.mediaCategory) {
        payload.target = options.mediaCategory;
      }
      const result = await (this.client.v1 as any).uploadMedia(fileBuffer, payload);
      if (typeof result === "string") return result;
      return String(result?.media_id_string || result?.media_id || result);
    } catch (error) {
      logger.error("x_media_upload_failed", {
        mimeType,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
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

  async getTweetsPublicMetrics(tweetIds: string[]) {
    const ids = tweetIds.filter(Boolean);
    if (ids.length === 0) return [] as any[];
    const response = await (this.client.v2 as any).tweets(ids, {
      "tweet.fields": ["public_metrics"],
    });
    return response?.data || [];
  }
}
