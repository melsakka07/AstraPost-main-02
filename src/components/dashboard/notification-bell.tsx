"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clientLogger } from "@/lib/client-logger";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string | null;
  message: string | null;
  isRead: boolean | null;
  createdAt: string;
  metadata: any;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    // Polling-based notification fetching with retries and timeout handling
    const fetchNotifications = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;

      // Hard 8-second timeout — if the server doesn't respond in time,
      // abort rather than holding a browser connection slot indefinitely.
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        // Retry up to 3 times with exponential backoff for dev-server race conditions
        let lastError: Error | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (!inFlightRef.current) return; // Unmounted
          try {
            const res = await fetchWithAuth("/api/notifications", { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
              const data: Notification[] = await res.json();
              if (!inFlightRef.current) return; // Unmounted

              for (const n of data) {
                if (!seenIdsRef.current.has(n.id) && !n.isRead) {
                  if (n.type === "tier_downgrade_warning") {
                    toast.warning(n.title ?? "X Premium Subscription Changed", {
                      description: n.message,
                      action: {
                        label: "View Queue",
                        onClick: () => router.push("/dashboard/queue"),
                      },
                    });
                  }
                  seenIdsRef.current.add(n.id);
                }
              }

              setNotifications(data);
              setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
              return; // Success
            }
            // 404/500 — retry if not last attempt
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
            }
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            // Retry if not last attempt
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
            }
          }
        }
        // All retries exhausted
        if (lastError && lastError.name !== "AbortError") {
          clientLogger.error("Failed to fetch notifications after retries", {
            error: lastError.message,
          });
        }
      } catch (error) {
        // AbortError is expected on timeout or unmount cleanup.
        if ((error as Error)?.name === "AbortError") return;
        if (!inFlightRef.current) return; // Unmounted
        clientLogger.error("Failed to fetch notifications", {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        clearTimeout(timeoutId);
        inFlightRef.current = false;
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      clearInterval(interval);
      inFlightRef.current = false; // signals unmounted to prevent state updates
      // Do NOT abort the fetch to prevent net::ERR_ABORTED console noise.
      // The server will timeout and close the connection in 7 seconds anyway.
    };
  }, [router]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetchWithAuth("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        throw new Error(`Failed to mark notification as read (${res.status})`);
      }
      // Optimistic update
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      clientLogger.error("Failed to mark notification as read", {
        notificationId: id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const markAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent closing if we want to keep it open, but closing is fine.
    try {
      const res = await fetchWithAuth("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) {
        throw new Error(`Failed to mark all notifications as read (${res.status})`);
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      clientLogger.error("Failed to mark all notifications as read", {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error("Failed to mark all as read");
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.isRead) {
      await markAsRead(n.id);
    }
    // Navigate if applicable
    if (n.type === "post_failed" && n.metadata?.postId) {
      router.push("/dashboard/queue");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="ring-background absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 ring-2"
            />
          )}
          <span className="sr-only">
            {unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-1rem)]">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto px-2 py-1 text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center text-sm">No notifications</div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex cursor-pointer flex-col items-start gap-1 p-3",
                  !notification.isRead && "bg-muted/50"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="max-w-[180px] truncate text-sm font-medium">
                    {notification.title || "Notification"}
                  </span>
                  <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-2 w-full text-xs break-words">
                  {notification.message}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
