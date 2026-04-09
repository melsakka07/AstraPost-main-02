"use client";

import { useState } from "react";
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

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/subscribers/${subscriberId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ban: !isBanned }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error);
      }
      toast.success(
        isBanned ? `${subscriberName} has been unbanned` : `${subscriberName} has been banned`
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
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
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={
              isBanned ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }
          >
            {loading ? "Processing…" : isBanned ? "Unban" : "Ban subscriber"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
