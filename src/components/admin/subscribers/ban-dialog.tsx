"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface BanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriberId: string;
  subscriberName: string;
  isBanned: boolean;
  onSuccess: () => void;
}

export function BanDialog({
  open,
  onOpenChange,
  subscriberId,
  subscriberName,
  isBanned,
  onSuccess,
}: BanDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/subscribers/${subscriberId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ban: !isBanned, ...(reason.trim() && { reason: reason.trim() }) }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error);
      }
      toast.success(
        isBanned ? `${subscriberName} has been unbanned` : `${subscriberName} has been banned`
      );
      onSuccess();
      // Auto-close on success after a short delay
      setTimeout(() => {
        onOpenChange(false);
        setError(null);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Action failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isBanned ? "Unban subscriber?" : "Ban subscriber?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isBanned
              ? `This will restore ${subscriberName}'s access and allow them to log in again.`
              : `This will immediately suspend ${subscriberName}'s account and invalidate all their active sessions. They will not be able to log in until unbanned.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="bg-destructive/10 border-destructive text-destructive rounded-md border p-3 text-sm">
            <div className="flex gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Action failed</p>
                <p className="mt-0.5 text-xs">{error}</p>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div className="mt-4 space-y-1.5">
            <label className="text-sm font-medium">
              Reason <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="e.g. Violating terms of service, spam, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              disabled={loading}
              className="resize-none text-sm"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Note: This does not automatically cancel any active Stripe subscription.
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          {error ? (
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className={
                isBanned ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {loading ? "Retrying…" : "Retry"}
            </Button>
          ) : (
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading}
              className={
                isBanned ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {loading ? "Processing…" : isBanned ? "Unban" : "Ban subscriber"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
