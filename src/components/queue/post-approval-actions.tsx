
"use client";

import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PostApprovalActionsProps {
  postId: string;
  ariaLabel?: string;
}

export function PostApprovalActions({ postId, ariaLabel }: PostApprovalActionsProps) {
  const router = useRouter();

  const handleAction = async (action: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update post");
      }

      toast.success(`Post ${action}d successfully`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        aria-label={ariaLabel ? `Reject ${ariaLabel}` : undefined}
        className="text-destructive hover:text-destructive"
        onClick={() => handleAction("reject")}
      >
        <X className="mr-1 h-4 w-4" />
        Reject
      </Button>
      <Button
        size="sm"
        aria-label={ariaLabel ? `Approve ${ariaLabel}` : undefined}
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={() => handleAction("approve")}
      >
        <Check className="mr-1 h-4 w-4" />
        Approve
      </Button>
    </div>
  );
}
