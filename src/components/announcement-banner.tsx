"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Announcement {
  text: string;
  type: "info" | "warning" | "success";
}

const DISMISSED_KEY = "astrapost_announcement_dismissed";

const STYLES: Record<Announcement["type"], string> = {
  info: "bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300",
  warning: "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300",
  success: "bg-green-500/10 border-green-500/20 text-green-800 dark:text-green-300",
};

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedText = sessionStorage.getItem(DISMISSED_KEY);

    fetch("/api/announcement")
      .then((r) => r.json())
      .then((json) => {
        const data: Announcement | null = json.data;
        if (!data) return;
        // If user already dismissed this exact message this session, keep hidden
        if (dismissedText === data.text) return;
        setAnnouncement(data);
      })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    if (announcement) {
      sessionStorage.setItem(DISMISSED_KEY, announcement.text);
    }
    setDismissed(true);
  };

  if (!announcement || dismissed) return null;

  return (
    <div
      className={`flex items-center justify-between gap-4 border-b px-4 py-2.5 text-sm font-medium ${STYLES[announcement.type]}`}
    >
      <span className="flex-1 text-center">{announcement.text}</span>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
