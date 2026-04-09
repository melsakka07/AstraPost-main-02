"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function XHealthCheckButton() {
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);
        try {
          const res = await fetch("/api/x/health", { method: "GET" });
          const data = await res.json().catch(() => null);
          if (!res.ok || !data?.ok) {
            throw new Error(data?.error || "X health check failed");
          }
          toast.success(`Connected as @${data.user.username}`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "X health check failed");
        } finally {
          setIsPending(false);
        }
      }}
    >
      {isPending ? "Testing..." : "Test X connection"}
    </Button>
  );
}
