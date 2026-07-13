import "server-only";

import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { inboxItems, type InboxItem } from "@/lib/schema";
import { XApiService } from "@/lib/services/x-api";
import { recordXUsage } from "@/lib/services/x-budget-atomic";

// ── Types ────────────────────────────────────────────────────────────────────

/** A single engagement item fetched from X before it is persisted. */
export interface RawEngagement {
  tweetId: string;
  authorId: string;
  authorHandle: string;
  authorName?: string;
  authorAvatarUrl?: string;
  text: string;
  createdAt: string; // ISO date
  yourTweetId?: string;
  yourTweetText?: string;
  type: "mention" | "reply" | "quote";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract author info from a tweet object enriched with `_author`.
 * Falls back to the tweet's own fields if `_author` is not present.
 */
function extractAuthor(tweet: any): {
  authorId: string;
  authorHandle: string;
  authorName?: string;
  authorAvatarUrl?: string;
} {
  const author = tweet._author;
  const name = author?.name ?? tweet.author_name;
  const avatar = author?.profile_image_url;
  return {
    authorId: tweet.author_id ?? "",
    authorHandle: author?.username ?? tweet.author_handle ?? "",
    ...(name !== undefined && name !== null ? { authorName: name } : {}),
    ...(avatar !== undefined && avatar !== null ? { authorAvatarUrl: avatar } : {}),
  };
}

/**
 * Transform an array of enriched tweet objects from X API methods into
 * {@link RawEngagement} items.
 */
function transformTweets(
  tweets: any[],
  type: "mention" | "reply" | "quote",
  yourTweet?: { id: string; text: string }
): RawEngagement[] {
  return tweets.map((tweet: any) => {
    const author = extractAuthor(tweet);
    return {
      tweetId: tweet.id,
      authorId: author.authorId,
      authorHandle: author.authorHandle,
      ...(author.authorName !== undefined ? { authorName: author.authorName } : {}),
      ...(author.authorAvatarUrl !== undefined ? { authorAvatarUrl: author.authorAvatarUrl } : {}),
      text: tweet.text ?? "",
      createdAt: tweet.created_at ?? new Date().toISOString(),
      ...(yourTweet !== undefined
        ? { yourTweetId: yourTweet.id, yourTweetText: yourTweet.text }
        : {}),
      type,
    };
  });
}

/**
 * True when the X API rejected the request with 401 Unauthorized —
 * the stored access token is invalid even if `tokenExpiresAt` says otherwise.
 */
function isUnauthorizedError(error: unknown): boolean {
  return (error as { code?: number } | null)?.code === 401;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Refresh the inbox for a single X account.
 *
 * Fetches mentions, recent-tweet replies, and quote tweets from the X API,
 * transforms them into {@link RawEngagement} items, and upserts into the
 * `inbox_items` table.  Fetch failures for individual endpoints are logged
 * but do not fail the whole refresh — a partial result is returned.
 */
export async function refreshInboxForAccount(
  xAccountId: string,
  userId: string,
  xUserId: string
): Promise<{ newItems: number }> {
  let client = await XApiService.getClientForAccountId(xAccountId);
  if (!client) {
    logger.error(`inbox_refresh_no_client: xAccountId=${xAccountId} userId=${userId}`, {
      xAccountId,
      userId,
    });
    throw new Error(`Could not obtain X API client for account ${xAccountId}`);
  }

  const engagements: RawEngagement[] = [];

  // ── 1. Fetch mentions ──────────────────────────────────────────────────
  // The first X API call doubles as an auth probe: on 401, force a token
  // refresh once and retry (tokenExpiresAt can claim a dead token is valid).
  // Throws X_SESSION_EXPIRED (from getClientForAccountId / refreshWithLock)
  // when the account genuinely needs reconnecting.
  try {
    let mentionTweets: unknown[];
    try {
      mentionTweets = await client.getUserMentions(xUserId, 50);
    } catch (error) {
      if (!isUnauthorizedError(error)) throw error;
      logger.warn("inbox_refresh_token_stale_forcing_refresh", { xAccountId, userId });
      const refreshed = await XApiService.getClientForAccountId(xAccountId, {
        forceRefresh: true,
      });
      if (!refreshed) throw error;
      client = refreshed;
      mentionTweets = await client.getUserMentions(xUserId, 50);
    }
    await recordXUsage(userId, "read_owned", { endpoint: "/2/users/:id/mentions" });
    engagements.push(...transformTweets(mentionTweets, "mention"));
    logger.info("inbox_refresh_mentions_ok", {
      xAccountId,
      count: mentionTweets.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Reconnect-required is a hard failure the caller must surface to the user
    if (message === "X_SESSION_EXPIRED") throw error;
    logger.warn("inbox_refresh_mentions_failed", {
      xAccountId,
      error: message,
      unauthorizedAfterRefresh: isUnauthorizedError(error),
    });
  }

  // ── 2. Fetch recent tweets of the user ─────────────────────────────────
  let recentTweets: any[] = [];
  try {
    recentTweets = await client.getUserRecentTweets(xUserId, 20);
    await recordXUsage(userId, "read_owned", { endpoint: "/2/users/:id/tweets" });
    logger.info("inbox_refresh_recent_tweets_ok", {
      xAccountId,
      count: recentTweets.length,
    });
  } catch (error) {
    logger.warn("inbox_refresh_recent_tweets_failed", {
      xAccountId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // ── 3. For each recent tweet, fetch replies and quotes ─────────────────
  for (const tweet of recentTweets) {
    // Replies via conversation search
    try {
      const conversationTweets = await client.getTweetConversation(tweet.id, xUserId, 50);
      await recordXUsage(userId, "read_third", { endpoint: "/2/tweets/search/recent" });
      if (conversationTweets.length > 0) {
        engagements.push(
          ...transformTweets(conversationTweets, "reply", {
            id: tweet.id,
            text: tweet.text ?? "",
          })
        );
      }
    } catch (error) {
      // getTweetConversation already handles 403 (returns []) — this
      // catch is for unexpected errors (network, auth, etc.)
      logger.warn("inbox_refresh_conversation_failed", {
        xAccountId,
        tweetId: tweet.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Quote tweets
    try {
      const quoteTweets = await client.getTweetQuotes(tweet.id, 50);
      await recordXUsage(userId, "read_third", { endpoint: "/2/tweets/:id/quote_tweets" });
      if (quoteTweets.length > 0) {
        engagements.push(
          ...transformTweets(quoteTweets, "quote", {
            id: tweet.id,
            text: tweet.text ?? "",
          })
        );
      }
    } catch (error) {
      logger.warn("inbox_refresh_quotes_failed", {
        xAccountId,
        tweetId: tweet.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ── 4. Upsert ──────────────────────────────────────────────────────────
  const newItems = await upsertInboxItems(userId, xAccountId, engagements);

  logger.info("inbox_refresh_complete", {
    xAccountId,
    totalFetched: engagements.length,
    newItems,
  });

  return { newItems };
}

/**
 * Upsert engagement items into `inbox_items`.
 *
 * Uses `ON CONFLICT DO NOTHING` on the `(sourceTweetId, xAccountId)` unique
 * constraint so duplicate fetches are silently skipped.  Returns the count of
 * rows that were **actually inserted** (not conflicts).
 */
export async function upsertInboxItems(
  userId: string,
  xAccountId: string,
  items: RawEngagement[]
): Promise<number> {
  if (items.length === 0) return 0;

  const values = items.map((item) => ({
    userId,
    xAccountId,
    type: item.type,
    sourceTweetId: item.tweetId,
    sourceAuthorId: item.authorId,
    sourceAuthorHandle: item.authorHandle,
    sourceAuthorName: item.authorName ?? null,
    sourceAuthorAvatarUrl: item.authorAvatarUrl ?? null,
    sourceText: item.text,
    yourTweetId: item.yourTweetId ?? null,
    yourTweetText: item.yourTweetText ?? null,
    xCreatedAt: item.createdAt ? new Date(item.createdAt) : null,
  }));

  const result = await db
    .insert(inboxItems)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: inboxItems.id });

  return result.length;
}

/**
 * Get inbox items for a user with cursor-based pagination.
 *
 * Items are ordered by `xCreatedAt DESC` (newest tweet first).  Pass the
 * {@link nextCursor} from a previous response as the `cursor` param to fetch
 * the next page.
 */
export async function getInboxItems(params: {
  userId: string;
  xAccountId?: string;
  type?: "mention" | "reply" | "quote";
  isRead?: boolean;
  isArchived?: boolean;
  cursor?: string;
  limit?: number;
}): Promise<{ items: InboxItem[]; nextCursor: string | null; total: number }> {
  const { userId, xAccountId, type, isRead, isArchived, cursor, limit = 20 } = params;

  // Conditions shared by both the items query and the total count query
  const sharedConditions: ReturnType<typeof eq>[] = [eq(inboxItems.userId, userId)];
  if (xAccountId) sharedConditions.push(eq(inboxItems.xAccountId, xAccountId));
  if (type) sharedConditions.push(eq(inboxItems.type, type));
  if (isRead !== undefined) sharedConditions.push(eq(inboxItems.isRead, isRead));
  if (isArchived !== undefined) sharedConditions.push(eq(inboxItems.isArchived, isArchived));

  // Total count (without cursor / limit)
  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(inboxItems)
    .where(and(...sharedConditions));
  const total = Number(totalRow?.count ?? 0);

  // Items with cursor and limit
  const pageConditions = [...sharedConditions];
  if (cursor) pageConditions.push(lt(inboxItems.xCreatedAt, new Date(cursor)));

  const rows = await db
    .select()
    .from(inboxItems)
    .where(and(...pageConditions))
    .orderBy(desc(inboxItems.xCreatedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();

  const nextCursor =
    hasMore && rows.length > 0 ? (rows[rows.length - 1]?.xCreatedAt?.toISOString() ?? null) : null;

  return { items: rows, nextCursor, total };
}

/**
 * Get the unread count for the badge.
 * Optionally scoped to a single X account.
 */
export async function getUnreadCount(userId: string, xAccountId?: string): Promise<number> {
  const conditions: ReturnType<typeof eq>[] = [
    eq(inboxItems.userId, userId),
    eq(inboxItems.isRead, false),
    eq(inboxItems.isArchived, false),
  ];
  if (xAccountId) conditions.push(eq(inboxItems.xAccountId, xAccountId));

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(inboxItems)
    .where(and(...conditions));

  return Number(row?.count ?? 0);
}

// ── Mutation helpers ─────────────────────────────────────────────────────────

/**
 * Mark a single inbox item as read.
 */
export async function markAsRead(itemId: string, userId: string): Promise<void> {
  await db
    .update(inboxItems)
    .set({ isRead: true })
    .where(and(eq(inboxItems.id, itemId), eq(inboxItems.userId, userId)));
}

/**
 * Bulk mark inbox items as read.
 */
export async function bulkMarkAsRead(itemIds: string[], userId: string): Promise<void> {
  if (itemIds.length === 0) return;

  await db
    .update(inboxItems)
    .set({ isRead: true })
    .where(and(inArray(inboxItems.id, itemIds), eq(inboxItems.userId, userId)));
}

/**
 * Archive a single inbox item.
 */
export async function archiveItem(itemId: string, userId: string): Promise<void> {
  await db
    .update(inboxItems)
    .set({ isArchived: true })
    .where(and(eq(inboxItems.id, itemId), eq(inboxItems.userId, userId)));
}

/**
 * Bulk archive inbox items.
 */
export async function bulkArchiveItems(itemIds: string[], userId: string): Promise<void> {
  if (itemIds.length === 0) return;

  await db
    .update(inboxItems)
    .set({ isArchived: true })
    .where(and(inArray(inboxItems.id, itemIds), eq(inboxItems.userId, userId)));
}

/**
 * Mark an inbox item as replied (with or without AI assistance).
 */
export async function markAsReplied(
  itemId: string,
  userId: string,
  aiReplied: boolean
): Promise<void> {
  await db
    .update(inboxItems)
    .set({ isReplied: true, aiReplied })
    .where(and(eq(inboxItems.id, itemId), eq(inboxItems.userId, userId)));
}
