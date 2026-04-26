"use client";

import { AlertTriangle, Twitter } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

interface TokenWarningBannerProps {
  username?: string;
}

export function TokenWarningBanner({ username }: TokenWarningBannerProps) {
  const t = useTranslations("dashboard_shell");
  const handleReconnect = async () => {
    // Preserve current URL in callback if needed, here we just go back to dashboard
    await signIn.social({
      provider: "twitter",
      callbackURL: "/dashboard",
    });
  };

  return (
    <div className="bg-destructive/10 border-destructive/20 flex flex-col items-center justify-between gap-3 border-b px-4 py-3 text-sm sm:flex-row">
      <div className="text-destructive flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p>
          <strong>{t("token_warning.title")}</strong> {username ? `@${username}` : ""}{" "}
          {t("token_warning.message")}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-destructive/40 text-destructive hover:bg-destructive/20 hover:text-destructive w-full shrink-0 sm:w-auto"
        onClick={handleReconnect}
      >
        <Twitter className="mr-2 h-4 w-4" />
        {t("token_warning.reconnect")}
      </Button>
    </div>
  );
}
