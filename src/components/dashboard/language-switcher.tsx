"use client";

import { useState } from "react";
import { useSyncExternalStore } from "react";
import { Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/auth-client";
import { LANGUAGES } from "@/lib/constants";

function getLocaleCookie(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/);
  return match?.[1] ?? "en";
}

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function LanguageSwitcher() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const isClient = useIsClient();

  const currentLang =
    (session?.user &&
      "language" in session.user &&
      ((session.user as Record<string, unknown>).language as string)) ||
    getLocaleCookie() ||
    "en";

  // Ensure button is never disabled during SSR to prevent hydration mismatch
  const shouldShowSpinner = isClient && loading;

  const handleLanguageChange = async (code: string) => {
    if (code === currentLang) return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: code,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!res.ok) throw new Error("Failed to update language");
      window.location.reload();
    } catch {
      toast.error("Failed to switch language");
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label="Switch language"
          disabled={shouldShowSpinner}
        >
          {shouldShowSpinner ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={currentLang === lang.code ? "bg-accent font-semibold" : ""}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
