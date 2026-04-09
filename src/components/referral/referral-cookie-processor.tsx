"use client";

import { useEffect } from "react";

export function ReferralCookieProcessor() {
  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )astrapost_ref=([^;]*)/);
    if (!match || match[1] === undefined) return;

    const code = decodeURIComponent(match[1]);
    if (!code) return;

    // Clear cookie immediately to prevent duplicate calls
    document.cookie = "astrapost_ref=;path=/;max-age=0;SameSite=Lax";

    // Call set-referrer API in the background
    fetch("/api/user/set-referrer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralCode: code }),
    }).catch((err) => console.error("Failed to process referral cookie:", err));
  }, []);

  return null;
}
