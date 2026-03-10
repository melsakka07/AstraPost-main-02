"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function OnboardingRedirect({ isCompleted }: { isCompleted: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isCompleted && pathname !== "/dashboard/onboarding") {
      router.push("/dashboard/onboarding");
    }
  }, [isCompleted, pathname, router]);

  return null;
}
