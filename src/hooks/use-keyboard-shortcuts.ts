"use client";

import { useEffect } from "react";

export interface KeyboardShortcut {
  key: string;
  /** Requires Cmd (Mac) or Ctrl (Windows/Linux) */
  metaOrCtrl?: boolean;
  shift?: boolean;
  handler: () => void;
  /** Human-readable label, e.g. "⌘↵ Publish" */
  label?: string;
}

/**
 * P3-C: Registers global keyboard shortcuts.
 *
 * All shortcuts require metaOrCtrl=true (Cmd/Ctrl) to avoid interfering with
 * normal typing in textareas. Shortcuts work even when focus is inside an
 * input or textarea so composers can use Cmd+Enter to submit.
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  disabled = false
) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;

      for (const shortcut of shortcuts) {
        if (!shortcut.metaOrCtrl) continue;
        if (e.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;
        if (shortcut.shift && !e.shiftKey) continue;
        if (!shortcut.shift && e.shiftKey) continue;

        e.preventDefault();
        shortcut.handler();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, disabled]);
}
