"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function QueueRealtimeListener() {
  const router = useRouter();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const eventSource = new EventSource("/api/queue/sse");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "completed") {
          toast.success("Post published successfully");
          setAnnouncement("Post published successfully");
          router.refresh();
        } else if (data.type === "failed") {
          toast.error(`Post failed: ${data.failedReason}`);
          setAnnouncement(`Post failed: ${data.failedReason}`);
          router.refresh();
        }
      } catch (e) {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [router]);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  );
}
