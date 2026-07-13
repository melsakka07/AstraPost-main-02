import { z } from "zod";
import { trendItemSchema } from "@/lib/schemas/common";

/**
 * Request schema for the AI Discovery X-Trends endpoint.
 * `query` is a free-text subject the user wants trends about.
 */
export const discoverTrendsRequestSchema = z.object({
  query: z.string().trim().min(2).max(120),
});

export type DiscoverTrendsRequest = z.infer<typeof discoverTrendsRequestSchema>;

/** Re-exported from the shared schema so the frontend imports the type from a stable place. */
export type TrendItem = z.infer<typeof trendItemSchema>;

/**
 * Response contract the frontend imports — do not reshape.
 */
export interface DiscoverTrendsResponse {
  trends: TrendItem[];
}
