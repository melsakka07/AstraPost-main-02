"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signIn, useSession } from "@/lib/auth-client";

export function SignInButton({ referralCode }: { referralCode?: string }) {
  const { data: session, isPending: sessionPending } = useSession();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("auth");

  if (sessionPending) {
    return (
      <button
        disabled
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-black text-sm font-medium text-white opacity-50"
      >
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        {t("loading")}
      </button>
    );
  }

  if (session) {
    return null;
  }

  async function handleSignIn() {
    setIsPending(true);
    setError(null);

    try {
      if (referralCode) {
        const isSecure = window.location.protocol === "https:";
        document.cookie = `astrapost_ref=${encodeURIComponent(referralCode)};path=/;max-age=604800;SameSite=Lax${isSecure ? ";Secure" : ""}`;
      }
      await signIn.social({
        provider: "twitter",
        callbackURL: "/dashboard",
      });
    } catch {
      setError(t("sign_in_error"));
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isPending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-black text-sm font-medium text-white transition-opacity hover:bg-black/90 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
        aria-label={t("sign_in_aria")}
      >
        {isPending ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        )}
        {isPending ? t("redirecting") : t("sign_in_with_x")}
      </button>

      {error && (
        <p role="alert" className="text-destructive text-center text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
