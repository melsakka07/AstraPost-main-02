"use client";

import { useState, useSyncExternalStore } from "react";
import { CalendarDays, Keyboard, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const HINT_KEY = "astra-composer-hint-seen";

function hasSeenHint(): boolean {
  try {
    return !!localStorage.getItem(HINT_KEY);
  } catch {
    return true;
  }
}

function subscribeToHint(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getHintServerSnapshot() {
  return true;
}

/**
 * P3-E: First-time composer hint overlay.
 *
 * Shows a dismissible banner with three quick tips the first time a user
 * visits the compose page. Dismissed state is persisted in localStorage so
 * it never appears again after the user clicks "Got it".
 */
export function ComposerOnboardingHint({ accountCount = 0 }: { accountCount?: number }) {
  const [dismissed, setDismissed] = useState(false);
  const seenHint = useSyncExternalStore(
    subscribeToHint,
    hasSeenHint,
    getHintServerSnapshot
  );
  const visible = !seenHint && !dismissed;

  const dismiss = () => {
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  if (!visible) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <p className="font-medium text-foreground">Welcome to the Composer 👋</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>Use <strong>AI Writer</strong> in the sidebar to generate full threads in seconds.</span>
            </li>
            <li className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>Pick a <strong>date &amp; time</strong> to schedule, or click <strong>Post to X</strong> to publish now.</span>
            </li>
            <li className="flex items-center gap-2">
              <Keyboard className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                Keyboard shortcuts:{" "}
                <kbd className="rounded bg-muted px-1 py-0.5 text-xs font-mono">⌘↵</kbd> publish,{" "}
                <kbd className="rounded bg-muted px-1 py-0.5 text-xs font-mono">⌘D</kbd> draft,{" "}
                <kbd className="rounded bg-muted px-1 py-0.5 text-xs font-mono">⌘K</kbd> open AI.
              </span>
            </li>
            {accountCount >= 2 && (
              <li className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  Posting to multiple accounts? Use the account selector above to choose which X accounts this post goes to.
                </span>
              </li>
            )}
          </ul>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={dismiss}
          aria-label="Dismiss hint"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="outline" onClick={dismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
