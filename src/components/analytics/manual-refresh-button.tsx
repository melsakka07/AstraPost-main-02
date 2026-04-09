"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ManualRefreshButton({ xAccountId }: { xAccountId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const res = await fetch("/api/analytics/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ xAccountIds: [xAccountId] }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            throw new Error(body?.error || "Refresh failed");
          }
          toast.success("Refresh queued");
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Refresh failed");
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "Refreshing..." : "Refresh now"}
    </Button>
  );
}
