"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ClearQueueButtonProps {
  queueName: string;
  queueLabel: string;
  disabled: boolean;
}

export function ClearQueueButton({ queueName, queueLabel, disabled }: ClearQueueButtonProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);

  const handleClear = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/jobs/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue: queueName }),
      });

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        throw new Error(error || "Request failed");
      }

      const json = await response.json();
      toast.success(t("jobs.cleared", { queue: queueLabel, count: json.data?.cleared ?? 0 }));
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(t("jobs.clear_failed", { queue: queueLabel }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setConfirmText("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={disabled} className="shrink-0">
          <Trash2 className="me-2 h-4 w-4" />
          {t("jobs.clear_queue")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("jobs.clear_confirm_title", { queue: queueLabel })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("jobs.clear_confirm_desc", { queue: queueLabel })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Type <code className="bg-muted rounded px-1">CLEAR</code> to confirm
          </label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="CLEAR"
            disabled={loading}
            className="font-mono"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClear}
            disabled={loading || confirmText !== "CLEAR"}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? `${t("common.delete")}...` : t("common.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
