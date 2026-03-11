"use client";

import { useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function DashboardTour() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    // Check if tour already completed
    const tourCompleted = localStorage.getItem("astro-tour-completed");
    if (tourCompleted) return;

    const tourDriver = driver({
      showProgress: true,
      animate: true,
      doneBtnText: "Done",
      nextBtnText: "Next",
      prevBtnText: "Previous",
      onDestroyed: () => {
        localStorage.setItem("astro-tour-completed", "true");
      },
      steps: [
        {
          element: "aside",
          popover: {
            title: "Welcome to AstraPost!",
            description: "This is your main navigation. Access all your tools here.",
            side: "right",
            align: "start",
          },
        },
        {
            element: "a[href='/dashboard/compose']",
            popover: {
              title: "Create Content",
              description: "Draft tweets, threads, and schedule them for later.",
              side: "right",
            },
        },
        {
            element: "a[href='/dashboard/analytics']",
            popover: {
              title: "Track Performance",
              description: "See how your content is performing with detailed analytics.",
              side: "right",
            },
        },
        {
            element: "a[href='/dashboard/achievements']",
            popover: {
              title: "Gamified Milestones",
              description: "Unlock badges and track your growth streaks here!",
              side: "right",
            },
        },
        {
            element: "a[href='/dashboard/referrals']",
            popover: {
              title: "Referral Program",
              description: "Invite friends and earn credits for your subscription.",
              side: "right",
            },
        }
      ],
    });

    // Small delay to ensure UI is ready
    const timer = setTimeout(() => {
        tourDriver.drive();
    }, 1000);

    return () => clearTimeout(timer);
  }, [hasMounted]);

  return null;
}
