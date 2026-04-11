"use client";

import { useState } from "react";
import { LogOut, UserCheck } from "lucide-react";
import { Button } from "./button";

interface ImpersonationBannerProps {
  sessionId: string;
  impersonatedBy: string;
  targetUserEmail: string;
}

export function ImpersonationBanner({ sessionId, targetUserEmail }: ImpersonationBannerProps) {
  const [stopping, setStopping] = useState(false);

  const handleStop = async () => {
    setStopping(true);
    try {
      const res = await fetch(`/api/admin/impersonation/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Need to trigger a full page reload so BetterAuth picks up the old session
        // Or redirect to /admin/subscribers where they came from
        window.location.href = "/admin/subscribers";
      } else {
        setStopping(false);
      }
    } catch (e) {
      setStopping(false);
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-700 dark:text-purple-400">
      <div className="flex items-center gap-2">
        <UserCheck className="h-4 w-4" />
        <span>
          You are currently impersonating <strong>{targetUserEmail}</strong>. Actions you take will
          be logged.
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 border-purple-500/30 text-purple-700 hover:bg-purple-500/20 dark:border-purple-500/30 dark:text-purple-400"
        onClick={handleStop}
        disabled={stopping}
      >
        <LogOut className="mr-2 h-3 w-3" />
        {stopping ? "Stopping..." : "Stop Impersonating"}
      </Button>
    </div>
  );
}
