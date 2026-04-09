/**
 * Composer Bridge — sends AI-generated content to the Composer page.
 *
 * Stores a typed payload in sessionStorage then navigates to /dashboard/compose.
 * The Composer reads `composer_payload` on mount and populates the editor.
 *
 * Usage (from any AI tool page):
 *   import { sendToComposer } from "@/lib/composer-bridge";
 *   sendToComposer(["tweet 1", "tweet 2"], { source: "ai-writer", tone: "casual" });
 */

export interface ComposerPayload {
  tweets: string[];
  source?: string;
  tone?: string;
  type?: "tweet" | "thread";
}

export function sendToComposer(tweets: string[], metadata?: Omit<ComposerPayload, "tweets">): void {
  if (tweets.length === 0) return;

  const payload: ComposerPayload = { tweets, ...metadata };
  try {
    sessionStorage.setItem("composer_payload", JSON.stringify(payload));
  } catch {
    // sessionStorage may be unavailable (private mode, storage full) — fail silently
  }

  const type = metadata?.type ?? (tweets.length > 1 ? "thread" : "tweet");
  window.location.href = `/dashboard/compose?type=${type}`;
}
