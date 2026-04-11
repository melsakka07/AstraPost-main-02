"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface NotificationPreviewProps {
  title: string;
  body: string;
  targetType: string;
  targetCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPreview({
  title,
  body,
  targetType,
  targetCount,
  open,
  onOpenChange,
}: NotificationPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Desktop Preview */}
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Desktop
            </p>
            <Card className="border">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <h3 className="text-foreground font-semibold">{title || "Notification Title"}</h3>
                  <p className="text-muted-foreground text-sm">{body || "Notification message"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Preview */}
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Mobile
            </p>
            <div className="bg-muted max-w-xs space-y-2 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <div className="bg-primary/20 h-8 w-8 rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{title || "Notification Title"}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {body || "Notification message"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-muted/50 space-y-3 rounded-lg p-4">
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                Recipients
              </p>
              <p className="text-lg font-bold">{targetCount.toLocaleString()}</p>
              <p className="text-muted-foreground text-xs">
                {targetType === "all"
                  ? "All users"
                  : targetType === "segment"
                    ? "Selected segment"
                    : "Individual users"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                Estimated Delivery
              </p>
              <p className="text-foreground text-sm">Instant (within 1-5 seconds)</p>
            </div>

            <div>
              <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                Delivery Rate
              </p>
              <p className="text-foreground text-sm">~98% (typical for push notifications)</p>
            </div>
          </div>

          <Button onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
