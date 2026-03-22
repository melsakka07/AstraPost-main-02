"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReschedulePostForm({
  postId,
  initialDate,
}: {
  postId: string;
  initialDate: string;
}) {
  const router = useRouter();
  const [scheduledAt, setScheduledAt] = useState(initialDate);
  const [isPending, setIsPending] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Input
        type="datetime-local"
        autoFocus
        aria-label="New scheduled date and time"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
      />
      <Button
        variant="outline"
        disabled={isPending}
        onClick={async () => {
          setIsPending(true);
          try {
            const res = await fetch(`/api/posts/${postId}/reschedule`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ scheduledAt: new Date(scheduledAt).toISOString() }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => null);
              throw new Error(body?.error || "Reschedule failed");
            }
            toast.success("Rescheduled");
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Reschedule failed");
          } finally {
            setIsPending(false);
          }
        }}
      >
        {isPending ? "Saving..." : "Reschedule"}
      </Button>
    </div>
  );
}

