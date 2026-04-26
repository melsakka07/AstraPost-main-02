"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Trash2, Edit2, XCircle } from "lucide-react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NotificationRow {
  id: string;
  title: string;
  targetType: string;
  targetCount: number;
  status: "draft" | "scheduled" | "sent" | "failed";
  sentAt?: string;
  deliveredCount?: number;
  readCount?: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
  scheduled: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  sent: "bg-green-500/10 text-green-700 dark:text-green-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

interface NotificationHistoryTableProps {
  initialData?: NotificationRow[];
}

export function NotificationHistoryTable({ initialData }: NotificationHistoryTableProps) {
  const locale = useLocale();
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialData ?? []);
  const [loading, setLoading] = useState(initialData === null);
  const pathname = usePathname();

  useEffect(() => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 8000);

    fetch("/api/admin/notifications", { signal: abortController.signal })
      .then((r) => r.json())
      .then((json) => setNotifications(json.data ?? []))
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") {
          setNotifications([]);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, [pathname]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this notification?")) return;

    try {
      const response = await fetch(`/api/admin/notifications/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this scheduled notification?")) return;

    try {
      const response = await fetch(`/api/admin/notifications/${id}/cancel`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to cancel");

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "draft" as const } : n))
      );
      toast.success("Notification cancelled");
    } catch (error) {
      toast.error("Failed to cancel notification");
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Title
                </TableHead>
                <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Target
                </TableHead>
                <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Status
                </TableHead>
                <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                  Delivered / Read
                </TableHead>
                <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Sent At
                </TableHead>
                <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    No notifications yet
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="max-w-xs truncate font-medium">
                      {notification.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {notification.targetType.charAt(0).toUpperCase() +
                        notification.targetType.slice(1)}{" "}
                      ({notification.targetCount.toLocaleString()})
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_COLORS[notification.status]}>
                        {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {notification.status === "sent" && (
                        <span className="text-muted-foreground">
                          {notification.deliveredCount?.toLocaleString() || 0} /{" "}
                          {notification.readCount?.toLocaleString() || 0}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {notification.sentAt
                        ? formatDistanceToNow(new Date(notification.sentAt), {
                            addSuffix: true,
                            locale: locale === "ar" ? ar : enUS,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {notification.status === "draft" && (
                          <Button variant="ghost" size="sm" onClick={() => {}} title="Edit draft">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {notification.status === "scheduled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(notification.id)}
                            title="Cancel scheduled"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(notification.id)}
                          title="Delete"
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
