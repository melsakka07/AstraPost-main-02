"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface BulkApproveButtonProps {
  postIds: string[];
  action: "approve" | "reject";
}

export function BulkApproveButton({ postIds, action }: BulkApproveButtonProps) {
  const t = useTranslations("queue");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const label = action === "approve" ? t("bulk_approve") : t("reject");

  const handleBulk = async () => {
    setLoading(true);
    try {
      await Promise.all(
        postIds.map((id) =>
          fetch(`/api/posts/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          })
        )
      );
      toast.success(
        action === "approve"
          ? `${postIds.length} post${postIds.length > 1 ? "s" : ""} approved`
          : `${postIds.length} post${postIds.length > 1 ? "s" : ""} rejected`
      );
      router.refresh();
    } catch {
      toast.error(t("toasts.bulk_update_failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      aria-label={`${label} ${postIds.length} posts`}
      className={
        action === "approve"
          ? "border-success-6 text-success-11 hover:bg-success-3"
          : "border-destructive/40 text-destructive hover:bg-destructive/10"
      }
      onClick={handleBulk}
    >
      {loading ? (
        <Loader2 className="me-1 h-4 w-4 animate-spin" />
      ) : action === "approve" ? (
        <CheckCheck className="me-1 h-4 w-4" />
      ) : (
        <XCircle className="me-1 h-4 w-4" />
      )}
      {loading ? "Processing…" : label}
    </Button>
  );
}
