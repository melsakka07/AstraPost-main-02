"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function DashboardTour() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
              title: "Write & Schedule",
              description:
                "Compose your tweets and threads here. You can preview, add media, and schedule them.",
              side: "right",
              align: "start",
            },
          },
          {
            element: '[data-tour="ai-tools"]',
            popover: {
              title: "AI Assistant",
              description:
                "Use AI to generate hooks, rewrite tweets, translate, and more directly in the composer.",
              side: "right",
              align: "start",
            },
          },
          {
            element: '[data-tour="calendar"]',
            popover: {
              title: "Content Calendar",
              description:
                "View and manage all your scheduled posts in one place. Drag and drop to reschedule.",
              side: "right",
              align: "start",
            },
          },
          {
            element: '[data-tour="analytics"]',
            popover: {
              title: "Analytics",
              description:
                "Track your performance, see follower growth, and find the best times to post.",
              side: "right",
              align: "start",
            },
          },
          {
            element: '[data-tour="inspiration"]',
            popover: {
              title: "Inspiration",
              description:
                "Save great tweets and use them as templates or references for your own content.",
              side: "right",
              align: "start",
            },
          },
        ],
        onDestroyStarted: () => {
          if (!tourDriver.hasNextStep() || confirm("Are you sure you want to exit the tour?")) {
            tourDriver.destroy();
            // Remove ?tour=true from URL
            router.replace("/dashboard");
          }
        },
      });

      tourDriver.drive();
      hasRunRef.current = true;
    }, 500);

    return () => clearTimeout(timer);
  }, [isTourActive, router]);

  return null;
}
