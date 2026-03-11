"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FailureBanner({ hasFailures }: { hasFailures: boolean }) {
  const [visible, setVisible] = useState(hasFailures);

  useEffect(() => {
    setVisible(hasFailures);
  }, [hasFailures]);

  if (!visible) return null;

  return (
    <div className="relative flex items-center justify-between gap-4 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:bg-destructive/20">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium">
          One or more posts failed to publish. Check the queue to retry.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-destructive underline decoration-destructive underline-offset-4 hover:text-destructive/80"
          asChild
        >
          <Link href="/dashboard/queue">View Queue</Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-1 h-6 w-6 text-destructive hover:bg-destructive/10"
          onClick={() => setVisible(false)}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </div>
  );
}
