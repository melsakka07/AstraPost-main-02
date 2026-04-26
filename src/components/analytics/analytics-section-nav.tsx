"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const SECTION_IDS = [
  { id: "section-overview", key: "overview_tab" as const },
  { id: "section-performance", key: "performance_tab" as const },
  { id: "section-insights", key: "insights_tab" as const },
] as const;

export function AnalyticsSectionNav() {
  const t = useTranslations("analytics");
  const [active, setActive] = useState<string>("section-overview");

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      // Offset by ~80px to account for sticky nav height
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setActive(id);
  };

  useEffect(() => {
    const handleScroll = () => {
      for (const section of [...SECTION_IDS].reverse()) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActive(section.id);
          return;
        }
      }
      setActive("section-overview");
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 border-border sticky top-0 z-10 -mx-4 border-b px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex gap-1">
        {SECTION_IDS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollToSection(section.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active === section.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {t(section.key)}
          </button>
        ))}
      </div>
    </div>
  );
}
