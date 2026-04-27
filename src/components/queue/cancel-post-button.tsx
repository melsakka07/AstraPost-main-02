"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
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
import { clientLogger } from "@/lib/client-logger";

export function CancelPostButton({ postId, ariaLabel }: { postId: string; ariaLabel?: string }) {
  const t = useTranslations("queue");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      if (!res.ok) throw new Error("Failed to cancel post");

      toast.success(t("toasts.post_cancelled"));
      router.refresh();
    } catch (error) {
      clientLogger.error("Failed to cancel post", {
        postId,
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error(t("toasts.something_wrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={ariaLabel}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-1 h-4 w-4" />
          )}
          Cancel
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel scheduled post?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will remove the post from the queue. You can find it in your cancelled posts
            later (if implemented) or just delete it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            className="bg-destructive hover:bg-destructive/90"
          >
            Yes, Cancel
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
