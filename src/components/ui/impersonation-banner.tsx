"use client";

import { useEffect, useState } from "react";
import { AlertCircle, LogOut, UserCheck } from "lucide-react";
import { Button } from "./button";

interface ImpersonationBannerProps {
  sessionId: string;
  impersonatedBy: string;
  targetUserEmail: string;
  expiresAt: Date | string;
}

const WARNING_THRESHOLD_MINUTES = 5;

export function ImpersonationBanner({
  sessionId,
  targetUserEmail,
  expiresAt,
}: ImpersonationBannerProps) {
  const [stopping, setStopping] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  // Monitor session TTL and show warning when nearing expiration
  useEffect(() => {
    const checkTimeRemaining = () => {
      const expiresTimestamp = new Date(expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, expiresTimestamp - now);
      const remainingMinutes = remaining / (60 * 1000);

      setTimeRemaining(remaining);
      setShowWarning(remainingMinutes <= WARNING_THRESHOLD_MINUTES && remainingMinutes > 0);

      // If session expired, redirect
      if (remaining <= 0) {
        window.location.href = "/admin/subscribers";
      }
    };

    checkTimeRemaining();
    const interval = setInterval(checkTimeRemaining, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleStop = async () => {
    setStopping(true);
    try {
      const res = await fetch(`/api/admin/impersonation/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Redirect to admin panel
        window.location.href = "/admin/subscribers";
      } else {
        setStopping(false);
      }
    } catch (e) {
      setStopping(false);
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <>
      <div
        className={`flex items-center justify-between border-b px-4 py-2 text-sm font-medium ${
          showWarning
            ? "border-danger-6 bg-danger-3 text-danger-11"
            : "border-brand-6 bg-brand-3 text-brand-11"
        }`}
      >
        <div className="flex items-center gap-2">
          {showWarning ? <AlertCircle className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          <span>
            {showWarning ? (
              <>
                <strong>Session expiring soon!</strong> Impersonating{" "}
                <strong>{targetUserEmail}</strong> —{" "}
                {timeRemaining ? formatTimeRemaining(timeRemaining) : "expiring"} remaining
              </>
            ) : (
              <>
                You are currently impersonating <strong>{targetUserEmail}</strong>. Actions you take
                will be logged.
              </>
            )}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`h-7 ${
            showWarning
              ? "border-danger-6 text-danger-11 hover:bg-danger-4"
              : "border-brand-6 text-brand-11 hover:bg-brand-4"
          }`}
          onClick={handleStop}
          disabled={stopping}
        >
          <LogOut className="me-2 h-3 w-3" />
          {stopping ? "Stopping..." : "Stop Impersonating"}
        </Button>
      </div>
    </>
  );
}
