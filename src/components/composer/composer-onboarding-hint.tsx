"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Keyboard, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const HINT_KEY = "astra-composer-hint-seen";

/**
 * P3-E: First-time composer hint overlay.
 *
 * Shows a dismissible banner with three quick tips the first time a user
 * visits the compose page. Dismissed state is persisted in localStorage so
 * it never appears again after the user clicks "Got it".
 */
export function ComposerOnboardingHint({ accountCount = 0 }: { accountCount?: number }) {
  const [isMounted, setIsMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  let visible = false;
  try {
    visible = isMounted && !localStorage.getItem(HINT_KEY) && !dismissed;
  } catch {
    // ignore
  }

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
    <div className="border-primary/20 bg-primary/5 rounded-lg border px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <p className="text-foreground font-medium">Welcome to the Composer 👋</p>
          <ul className="text-muted-foreground space-y-1.5">
            <li className="flex items-center gap-2">
              <Sparkles className="text-primary h-3.5 w-3.5 shrink-0" />
              <span>
                Use <strong>AI Writer</strong> in the sidebar to generate full threads in seconds.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <CalendarDays className="text-primary h-3.5 w-3.5 shrink-0" />
              <span>
                Pick a <strong>date &amp; time</strong> to schedule, or click{" "}
                <strong>Post to X</strong> to publish now.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Keyboard className="text-primary h-3.5 w-3.5 shrink-0" />
              <span>
                Keyboard shortcuts:{" "}
                <kbd className="bg-muted rounded px-1 py-0.5 font-mono text-xs">⌘↵</kbd> publish,{" "}
                <kbd className="bg-muted rounded px-1 py-0.5 font-mono text-xs">⌘D</kbd> draft,{" "}
                <kbd className="bg-muted rounded px-1 py-0.5 font-mono text-xs">⌘K</kbd> open AI.
              </span>
            </li>
            {accountCount >= 2 && (
              <li className="flex items-center gap-2">
                <Users className="text-primary h-3.5 w-3.5 shrink-0" />
                <span>
                  Posting to multiple accounts? Use the account selector above to choose which X
                  accounts this post goes to.
                </span>
              </li>
            )}
          </ul>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-6 w-6 shrink-0"
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
