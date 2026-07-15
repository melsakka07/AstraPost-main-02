"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { UserProfile } from "@/components/auth/user-profile";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { useSession } from "@/lib/auth-client";
import { Button } from "./ui/button";

/**
 * Desktop auth actions for the marketing header.
 *
 * Auth state is resolved on the CLIENT via `useSession()` so the server render
 * stays deterministic (independent of the request session). This prevents the
 * hydration mismatch that occurred when the header branched on server-side auth,
 * and lets the marketing pages be statically cacheable.
 *
 * During the initial (pending) render — which is what the server emits and what
 * the client hydrates first — we show the logged-out CTAs (the dominant marketing
 * case). Once the session resolves on the client we swap in the authenticated
 * cluster. SSR output === client first render, so there is no hydration mismatch.
 */
export function SiteHeaderAuth() {
  const { data: session, isPending } = useSession();
  const t = useTranslations("nav");

  if (!isPending && session) {
    return (
      <div className="hidden items-center gap-3 md:flex">
        <NotificationBell />
        <Button variant="ghost" asChild>
          <Link href="/dashboard">{t("dashboard")}</Link>
        </Button>
        <UserProfile />
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-2 md:flex">
      <Button variant="ghost" asChild>
        <Link href="/login">{t("sign_in")}</Link>
      </Button>
      <Button asChild>
        <Link href="/login">{t("get_started")}</Link>
      </Button>
    </div>
  );
}
