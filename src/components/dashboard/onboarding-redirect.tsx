"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function OnboardingRedirect({ isCompleted }: { isCompleted: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!isCompleted && pathname !== "/dashboard/onboarding") {
      // Use hard navigation to ensure server-side data is refreshed
      window.location.href = "/dashboard/onboarding";
    }
  }, [isCompleted, pathname]);

  return null;
}
