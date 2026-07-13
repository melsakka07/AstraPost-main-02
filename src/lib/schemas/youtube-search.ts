import { z } from "zod";

/**
 * Request schema for the AI Discovery YouTube search endpoint.
 * `order` maps directly to the YouTube Data API `search.list` `order` param.
 */
export const youtubeSearchRequestSchema = z.object({
  query: z.string().trim().min(2).max(120),
  order: z.enum(["relevance", "viewCount", "date"]).optional(),
});

export type YouTubeSearchRequest = z.infer<typeof youtubeSearchRequestSchema>;

/**
 * A single YouTube search result surfaced to the discovery UI.
 * This is the fixed contract the frontend imports — do not reshape.
 */
export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  /** ISO-8601 timestamp */
  publishedAt: string;
  durationSeconds: number;
  viewCount: number;
  /** https://www.youtube.com/watch?v=<videoId> */
  url: string;
}
