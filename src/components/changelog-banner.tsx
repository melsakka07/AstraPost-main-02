"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";

interface ChangelogEntry {
  id: string;
  title: string;
  items: string[];
  date?: string;
}

const DISMISSED_KEY = "astrapost_changelog_dismissed";

const DEFAULT_CHANGELOG = [
  {
    id: "v1.6.0",
    title: "What's New",
    date: "2026-04-17",
    items: [
      "Avatar uploads in profile settings",
      "In-app changelog and feature announcements",
      "Improved dashboard performance",
    ],
  },
] as const satisfies ChangelogEntry[];

export function ChangelogBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [changelog, setChangelog] = useState<ChangelogEntry | null>(null);

  useEffect(() => {
    const dismissedId = localStorage.getItem(DISMISSED_KEY);

    // Fetch latest changelog from API or use default
    fetch("/api/changelog")
      .then((r) => r.json())
      .then((json: unknown) => {
        const data = (json as { data?: ChangelogEntry | null }).data;
        const entryToShow = data ?? DEFAULT_CHANGELOG[0]!;

        if (dismissedId === entryToShow.id) {
          setDismissed(true);
          return;
        }

        setChangelog(entryToShow);
      })
      .catch(() => {
        // Fallback to default if API fails
        const fallbackEntry = DEFAULT_CHANGELOG[0]!;
        if (dismissedId === fallbackEntry.id) {
          setDismissed(true);
          return;
        }
        setChangelog(fallbackEntry);
      });
  }, []);

  const dismiss = () => {
    if (changelog) {
      localStorage.setItem(DISMISSED_KEY, changelog.id);
    }
    setDismissed(true);
  };

  if (!changelog || dismissed) return null;

  return (
    <div className="border-b bg-gradient-to-r from-blue-500/5 to-purple-500/5">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex-1">
          <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-left">
            <span className="text-foreground text-sm font-semibold">{changelog.title}</span>
            <ChevronDown
              className={`text-muted-foreground h-4 w-4 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isOpen && (
            <ul className="text-muted-foreground mt-3 space-y-1 text-sm">
              {changelog.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss changelog"
          className="shrink-0 rounded p-1 opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
