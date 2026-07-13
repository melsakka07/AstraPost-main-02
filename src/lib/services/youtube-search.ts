import "server-only";

import { logger } from "@/lib/logger";
import type { YouTubeSearchResult } from "@/lib/schemas/youtube-search";

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";
const MAX_RESULTS = 12;
const REQUEST_TIMEOUT_MS = 10_000;

export type YouTubeSearchOrder = "relevance" | "viewCount" | "date";

export interface SearchYouTubeParams {
  query: string;
  order?: YouTubeSearchOrder;
  regionCode: string;
  relevanceLanguage: string;
}

/**
 * Typed error thrown when the YouTube Data API returns a non-2xx response.
 * `quotaExceeded` lets the route map to a friendly "temporarily unavailable"
 * message instead of a generic 500.
 */
export class YouTubeApiError extends Error {
  readonly status: number;
  readonly quotaExceeded: boolean;

  constructor(message: string, status: number, quotaExceeded = false) {
    super(message);
    this.name = "YouTubeApiError";
    this.status = status;
    this.quotaExceeded = quotaExceeded;
  }
}

interface SearchListItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: {
      medium?: { url?: string };
      default?: { url?: string };
      high?: { url?: string };
    };
  };
}

interface VideoListItem {
  id?: string;
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
}

/**
 * Parses an ISO-8601 duration (e.g. "PT1H2M3S") into total seconds.
 * Returns 0 for unparseable input.
 */
export function parseIso8601Duration(iso: string | undefined): number {
  if (!iso) return 0;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

async function fetchJson(url: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

function isQuotaError(body: unknown): boolean {
  const errors = (body as { error?: { errors?: Array<{ reason?: string }> } })?.error?.errors;
  return Array.isArray(errors) && errors.some((e) => e.reason === "quotaExceeded");
}

/**
 * Two-call YouTube Data API v3 flow:
 *   1. search.list (100 quota units) → collect videoIds + snippet metadata
 *   2. videos.list (1 quota unit) → contentDetails.duration + statistics.viewCount
 *
 * Reads YOUTUBE_API_KEY directly from process.env (NOT getServerEnv, which
 * validates the whole schema and would throw on the worker where the key is absent).
 * On any non-2xx from Google this THROWS a YouTubeApiError — no silent empty-array
 * fallback, so the route can surface the failure correctly.
 */
export async function searchYouTube({
  query,
  order,
  regionCode,
  relevanceLanguage,
}: SearchYouTubeParams): Promise<YouTubeSearchResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new YouTubeApiError("YOUTUBE_API_KEY is not configured", 503);
  }

  // ── 1. search.list ─────────────────────────────────────────────────────────
  const searchParams = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: query,
    maxResults: String(MAX_RESULTS),
    order: order ?? "relevance",
    regionCode,
    relevanceLanguage,
    safeSearch: "moderate",
    key: apiKey,
  });

  const search = await fetchJson(`${SEARCH_URL}?${searchParams.toString()}`);
  if (search.status !== 200) {
    const quota = isQuotaError(search.body);
    logger.error(`youtube_search_list_failed: status=${search.status} quota=${quota}`, {
      status: search.status,
      quotaExceeded: quota,
    });
    throw new YouTubeApiError("YouTube search request failed", search.status, quota);
  }

  const searchItems = ((search.body as { items?: SearchListItem[] })?.items ?? []).filter(
    (item): item is SearchListItem & { id: { videoId: string } } =>
      typeof item.id?.videoId === "string" && item.id.videoId.length > 0
  );

  if (searchItems.length === 0) return [];

  const videoIds = searchItems.map((item) => item.id.videoId);

  // ── 2. videos.list ─────────────────────────────────────────────────────────
  const videosParams = new URLSearchParams({
    part: "contentDetails,statistics",
    id: videoIds.join(","),
    key: apiKey,
  });

  const videos = await fetchJson(`${VIDEOS_URL}?${videosParams.toString()}`);
  if (videos.status !== 200) {
    const quota = isQuotaError(videos.body);
    logger.error(`youtube_videos_list_failed: status=${videos.status} quota=${quota}`, {
      status: videos.status,
      quotaExceeded: quota,
    });
    throw new YouTubeApiError("YouTube video details request failed", videos.status, quota);
  }

  const detailsById = new Map<string, VideoListItem>();
  for (const v of (videos.body as { items?: VideoListItem[] })?.items ?? []) {
    if (typeof v.id === "string") detailsById.set(v.id, v);
  }

  // ── Shape results, preserving search-relevance order ─────────────────────────
  return searchItems.map((item) => {
    const videoId = item.id.videoId;
    const details = detailsById.get(videoId);
    const thumbnails = item.snippet?.thumbnails;
    return {
      videoId,
      title: item.snippet?.title ?? "",
      channelTitle: item.snippet?.channelTitle ?? "",
      thumbnailUrl:
        thumbnails?.medium?.url ?? thumbnails?.high?.url ?? thumbnails?.default?.url ?? "",
      publishedAt: item.snippet?.publishedAt ?? "",
      durationSeconds: parseIso8601Duration(details?.contentDetails?.duration),
      viewCount: Number(details?.statistics?.viewCount ?? 0),
      url: `https://www.youtube.com/watch?v=${videoId}`,
    };
  });
}
