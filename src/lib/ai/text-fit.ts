import "server-only";

import { logger } from "@/lib/logger";

// ─── Sentence boundary detection ───────────────────────────────────────────────

/**
 * Locates sentence-ending punctuation positions in text.
 * Handles English (.!?), Arabic (same punctuation marks), and line breaks.
 * Returns character positions immediately after the punctuation mark.
 */
function findSentenceBoundaries(text: string): number[] {
  const boundaries: number[] = [];
  // Match sentence-ending punctuation followed by whitespace, line break, or end of string
  const regex = /[.!?](?:\s|$)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    boundaries.push(match.index + 1); // position after the punctuation
  }
  // Also treat consecutive newlines as sentence boundaries
  const newlineRegex = /\n{2,}/g;
  while ((match = newlineRegex.exec(text)) !== null) {
    boundaries.push(match.index);
  }
  return boundaries.sort((a, b) => a - b);
}

/**
 * Extract sentences from text, preserving sentence-ending punctuation.
 */
function extractSentences(text: string): string[] {
  const sentences: string[] = [];
  // Match a sentence: non-greedy characters followed by sentence-ending punctuation and whitespace/end
  const regex = /.*?[.!?](?:\s|$)/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    sentences.push(match[0]);
    lastIndex = match.index + match[0].length;
  }
  // Remaining text after last sentence (no sentence-ending punctuation)
  const remaining = text.slice(lastIndex).trim();
  if (remaining) {
    sentences.push(remaining);
  }
  return sentences;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Sentence-aware truncation for a single tweet.
 *
 * Truncates at the last complete sentence boundary before `max` characters.
 * Falls back to last word boundary if no sentence boundary is found.
 * Falls back to hard truncation at `max` if no word boundary is found.
 *
 * @param text - The generated tweet text
 * @param max  - Maximum characters allowed (default: 280)
 * @returns    - The truncated text, guaranteed to be <= max characters
 */
export function fitTweet(text: string, max = 280): string {
  if (text.length <= max) return text;

  const boundaries = findSentenceBoundaries(text);

  // Find the last sentence boundary before or at max
  let truncateAt = 0;
  for (const pos of boundaries) {
    if (pos <= max) {
      truncateAt = pos;
    } else {
      break;
    }
  }

  // If a sentence boundary was found, truncate there
  if (truncateAt > 0) {
    const result = text.slice(0, truncateAt).trim();
    if (result.length <= max) return result;
  }

  // Fallback: truncate at last word boundary
  const lastSpace = text.lastIndexOf(" ", max);
  if (lastSpace > 0) {
    const result = text.slice(0, lastSpace).trim();
    if (result.length <= max) return result;
  }

  // Hard fallback: character-level truncation
  logger.warn("fitTweet_hard_truncation", {
    originalLength: text.length,
    max,
    usedBoundary: false,
  });

  return text.slice(0, max).trim();
}

/**
 * Sentence-aware thread splitting.
 *
 * Splits long text into an array of tweets, each respecting `maxPerTweet`
 * characters. Preserves sentence boundaries: groups complete sentences
 * into tweets without breaking mid-sentence when possible.
 *
 * If a single sentence exceeds maxPerTweet, it is split at word boundaries.
 *
 * @param longText    - The full text to split into tweets
 * @param maxPerTweet - Maximum characters per tweet (default: 280)
 * @returns           - Array of tweet strings, each <= maxPerTweet characters
 */
export function splitThread(longText: string, maxPerTweet = 280): string[] {
  const sentences = extractSentences(longText);
  const tweets: string[] = [];
  let currentTweet = "";

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;

    // If a single sentence exceeds the limit, split it further by words
    if (sentence.length > maxPerTweet) {
      // Flush any in-progress tweet first
      if (currentTweet) {
        tweets.push(currentTweet.trim());
        currentTweet = "";
      }

      const words = sentence.split(/\s+/);
      let wordChunk = "";
      for (const word of words) {
        const candidate = wordChunk ? `${wordChunk} ${word}` : word;
        if (candidate.length <= maxPerTweet) {
          wordChunk = candidate;
        } else {
          if (wordChunk) tweets.push(wordChunk.trim());
          wordChunk = word;
        }
      }
      if (wordChunk) currentTweet = wordChunk;
      continue;
    }

    // Try to append this sentence to the current tweet
    const candidate = currentTweet ? `${currentTweet} ${sentence}` : sentence;

    if (candidate.length <= maxPerTweet) {
      currentTweet = candidate;
    } else {
      // Current tweet is full — push it and start a new one
      if (currentTweet) tweets.push(currentTweet.trim());
      currentTweet = sentence;
    }
  }

  // Flush the last tweet
  if (currentTweet.trim()) {
    tweets.push(currentTweet.trim());
  }

  // If no tweets were produced (empty input), return a single empty-constrained tweet
  if (tweets.length === 0) {
    return [longText.slice(0, maxPerTweet).trim()];
  }

  return tweets;
}
