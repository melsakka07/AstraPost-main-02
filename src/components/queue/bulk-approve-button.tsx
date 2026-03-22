"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface BulkApproveButtonProps {
  postIds: string[];
  action: "approve" | "reject";
}

export function BulkApproveButton({ postIds, action }: BulkApproveButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const label = action === "approve" ? "Approve All" : "Reject All";

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
      toast.error("Some posts could not be updated");
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
          ? "border-green-600/40 text-green-600 hover:bg-green-600/10"
          : "border-destructive/40 text-destructive hover:bg-destructive/10"
      }
      onClick={handleBulk}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-1" />
      ) : action === "approve" ? (
        <CheckCheck className="h-4 w-4 mr-1" />
      ) : (
        <XCircle className="h-4 w-4 mr-1" />
      )}
      {loading ? "Processing…" : label}
    </Button>
  );
}
