"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RetryPostButton({ postId, ariaLabel }: { postId: string; ariaLabel?: string }) {
  const t = useTranslations("queue");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      variant="outline"
      disabled={isPending}
      aria-label={ariaLabel}
      onClick={async () => {
        setIsPending(true);
        try {
          const res = await fetch(`/api/posts/${postId}/retry`, {
            method: "POST",
          });
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            throw new Error(body?.error || "Retry failed");
          }
          toast.success("Retry scheduled");
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Retry failed");
        } finally {
          setIsPending(false);
        }
      }}
    >
      {isPending ? "..." : t("retry")}
    </Button>
  );
}
