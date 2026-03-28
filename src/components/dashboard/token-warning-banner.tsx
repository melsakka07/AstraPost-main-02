"use client";

import { AlertTriangle, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

interface TokenWarningBannerProps {
  username?: string;
}

export function TokenWarningBanner({ username }: TokenWarningBannerProps) {
  const handleReconnect = async () => {
    // Preserve current URL in callback if needed, here we just go back to dashboard
    await signIn.social({
      provider: "twitter",
      callbackURL: "/dashboard",
    });
  };

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p>
          <strong>Connection Expired:</strong> Your connection to X (Twitter){" "}
          {username ? `@${username}` : ""} has expired. Scheduled posts will
          fail until you reconnect.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/20 hover:text-destructive w-full sm:w-auto"
        onClick={handleReconnect}
      >
        <Twitter className="mr-2 h-4 w-4" />
        Reconnect Now
      </Button>
    </div>
  );
}