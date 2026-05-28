"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, Info, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dismissNotification } from "@/lib/actions/notification-actions";
import { clientLogger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";

export interface Notification {
  key: string;
  severity: "info" | "warning" | "error";
  title: string;
  description: string;
  action?: { label: string; href: string };
  dismissible: boolean;
  /** Optional snapshot stored on dismiss — used for suppression logic (e.g. failure banner). */
  dismissSnapshot?: Record<string, unknown>;
}

interface NotificationCenterProps {
  serverNotifications: Notification[];
}

const SEVERITY_ICON = {
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
} as const;

/** Radix Popover may pass `onOpenChange` with `undefined` from internal state. */
function onOpenChangeSafe(setter: (open: boolean) => void, open: boolean | undefined) {
  if (typeof open === "boolean") {
    setter(open);
  }
}

export function NotificationCenter({ serverNotifications }: NotificationCenterProps) {
  const t = useTranslations("dashboard_shell");
  const [notifications, setNotifications] = useState<Notification[]>(() => serverNotifications);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDismiss = useCallback((notification: Notification) => {
    // Optimistic removal
    setNotifications((prev) => prev.filter((n) => n.key !== notification.key));

    startTransition(() => {
      const formData = new FormData();
      formData.set("notificationKey", notification.key);
      if (notification.dismissSnapshot) {
        formData.set("snapshotData", JSON.stringify(notification.dismissSnapshot));
      }
      dismissNotification(formData).catch((error) => {
        clientLogger.error("Failed to dismiss notification", {
          notificationKey: notification.key,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    });
  }, []);

  const handleDismissAll = useCallback(() => {
    const dismissible = notifications.filter((n) => n.dismissible);

    // Optimistic removal of all dismissible items
    setNotifications((prev) => prev.filter((n) => !n.dismissible));

    if (dismissible.length === 0) return;

    startTransition(() => {
      for (const notification of dismissible) {
        const formData = new FormData();
        formData.set("notificationKey", notification.key);
        if (notification.dismissSnapshot) {
          formData.set("snapshotData", JSON.stringify(notification.dismissSnapshot));
        }
        dismissNotification(formData).catch((error) => {
          clientLogger.error("Failed to dismiss notification (dismissAll)", {
            notificationKey: notification.key,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
    });
  }, [notifications]);

  const visibleCount = notifications.length;
  const hasDismissible = useMemo(() => notifications.some((n) => n.dismissible), [notifications]);

  return (
    <Popover open={open} onOpenChange={(o) => onOpenChangeSafe(setOpen, o)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {visibleCount > 0 && (
            <span
              aria-hidden="true"
              className="ring-background bg-danger-9 absolute end-1.5 top-1.5 h-2 w-2 rounded-full ring-2"
            />
          )}
          <span className="sr-only">{t("notifications.label")}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 max-w-[calc(100vw-1rem)] p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <h3 className="text-sm font-medium">{t("notifications.label")}</h3>
          {hasDismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissAll}
              disabled={isPending}
              className="h-auto px-2 py-1 text-xs"
            >
              {t("notifications.dismiss_all")}
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-[400px] overflow-y-auto" role="list">
          {notifications.length === 0 ? (
            <div className="text-muted-foreground p-6 text-center text-sm">
              {t("notifications.no_notifications")}
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = SEVERITY_ICON[notification.severity];

              const severityTextColor = {
                error: "text-destructive",
                warning: "text-warning-11",
                info: "text-info-11",
              }[notification.severity];

              return (
                <div
                  key={notification.key}
                  role="listitem"
                  className={cn(
                    "flex flex-col gap-1.5 border-b p-3 last:border-b-0",
                    notification.severity === "error" && "bg-destructive/5"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon
                      className={cn("mt-0.5 h-4 w-4 shrink-0", severityTextColor)}
                      aria-hidden="true"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" dir="auto">
                        {notification.title}
                      </p>
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs" dir="auto">
                        {notification.description}
                      </p>

                      {notification.action && (
                        <Link
                          href={notification.action.href}
                          className="text-primary mt-1.5 inline-block text-xs font-medium hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          {notification.action.label}
                        </Link>
                      )}
                    </div>

                    {notification.dismissible && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-mt-0.5 -mr-1 h-6 w-6 shrink-0"
                        onClick={() => handleDismiss(notification)}
                        aria-label={t("notifications.dismiss")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
