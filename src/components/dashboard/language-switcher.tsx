"use client";

import { useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { unsavedWorkRegistry } from "@/lib/unsaved-work-registry";

function getLocaleCookie(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/);
  return match?.[1] ?? "en";
}

/** Reload the page after stripping any `?lang=` query param so the cookie
 *  (set just before this call) takes effect. Without this, a visitor arriving
 *  via an SEO hreflink (e.g. `/?lang=en`) would be permanently stuck — the
 *  query param outranks the cookie in `resolveLocale()`. */
function reloadWithoutLangParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete("lang");
  window.location.href = url.toString();
}

export function LanguageSwitcher() {
  const t = useTranslations("dashboard_shell");
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  // Cookie-first priority matches resolveLocale() so the dropdown highlight
  // never disagrees with the rendered page content (multi-device scenario).
  const currentLang =
    getLocaleCookie() ||
    (session?.user &&
      "language" in session.user &&
      ((session.user as Record<string, unknown>).language as string)) ||
    "en";

  const handleLanguageChange = async (code: string) => {
    if (code === currentLang) return;

    // Guard against accidental data loss — only warn when something is actually
    // unsaved (composer draft, dirty form). No false-alarm dialogs on idle pages.
    if (unsavedWorkRegistry.hasUnsaved()) {
      if (
        !window.confirm(
          "You have unsaved work. Switching language will reload the page and you may lose your changes. Continue?"
        )
      ) {
        return;
      }
    }

    setLoading(true);

    if (!session) {
      document.cookie = `locale=${code}; path=/; max-age=31536000; SameSite=Lax`;
      reloadWithoutLangParam();
      return;
    }

    try {
      // Set cookie before the API call so the server reads the correct locale on reload,
      // even if the session token is cached with a stale language value.
      document.cookie = `locale=${code}; path=/; max-age=31536000; SameSite=Lax`;
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: code,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!res.ok) throw new Error("Failed to update language");
      reloadWithoutLangParam();
    } catch {
      toast.error(t("switch_language_failed"));
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
          aria-label={t("switch_language")}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={currentLang === lang.code ? "bg-accent font-semibold" : ""}
          >
            {lang.code === "ar" ? t("language_arabic") : t("language_english")}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
