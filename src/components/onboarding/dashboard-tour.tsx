"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useTranslations } from "next-intl";

export function DashboardTour() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("onboarding");
  const isTourActive = searchParams?.get("tour") === "true";
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!isTourActive || hasRunRef.current) return;

    // Slight delay to allow DOM to fully render
    const timer = setTimeout(() => {
      const tourDriver = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayColor: "rgba(0, 0, 0, 0.7)",
        steps: [
          {
            element: '[data-tour="compose"]',
            popover: {
              title: t("tour.step1_title"),
              description: t("tour.step1_description"),
              side: "right",
              align: "start",
            },
          },
          {
            element: '[data-tour="ai-tools"]',
            popover: {
              title: t("tour.step2_title"),
              description: t("tour.step2_description"),
              side: "right",
              align: "start",
            },
          },
          {
            element: '[data-tour="schedule"]',
            popover: {
              title: t("tour.step3_title"),
              description: t("tour.step3_description"),
              side: "right",
              align: "start",
            },
          },
          {
            element: '[data-tour="analytics"]',
            popover: {
              title: t("tour.step4_title"),
              description: t("tour.step4_description"),
              side: "right",
              align: "start",
            },
          },
          {
            element: '[data-tour="inspiration"]',
            popover: {
              title: t("tour.step5_title"),
              description: t("tour.step5_description"),
              side: "right",
              align: "start",
            },
          },
        ],
        onDestroyStarted: () => {
          if (!tourDriver.hasNextStep() || confirm(t("tour.exit_confirmation"))) {
            tourDriver.destroy();
            // Mark tour as seen server-side (fire-and-forget)
            fetch("/api/user/preferences", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ onboardingState: { tourSeen: true } }),
            }).catch(() => {});
            // Remove ?tour=true from URL
            router.replace("/dashboard");
          }
        },
      });

      tourDriver.drive();
      hasRunRef.current = true;
    }, 500);

    return () => clearTimeout(timer);
  }, [isTourActive, router, t]);

  return null;
}
