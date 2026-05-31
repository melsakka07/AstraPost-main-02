/** Shared types for AI thread result components. */

export interface TweetData {
  text: string;
  charCount: number;
}

export interface ThreadResult {
  tweets: TweetData[];
  title: string;
  sourceLanguage?: string;
  redactions?: number;
}
