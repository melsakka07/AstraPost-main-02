import { z } from "zod";

export const youtubeToThreadRequestSchema = z.object({
  youtubeUrl: z.string().min(1, "YouTube URL is required"),
  provider: z.enum(["deepgram", "whisper"]),
  language: z.enum(["ar", "en"]),
  tweetCount: z.number().int().min(3).max(15).default(8),
  tone: z
    .enum(["professional", "educational", "casual", "formal", "enthusiastic"])
    .default("casual"),
  previewOnly: z.boolean().optional(),
});

export type YoutubeToThreadRequest = z.infer<typeof youtubeToThreadRequestSchema>;

export const youtubeThreadOutputSchema = z.object({
  tweets: z.array(z.string().max(280)).min(3).max(15),
  title: z.string(),
});

export type YoutubeThreadOutput = z.infer<typeof youtubeThreadOutputSchema>;
