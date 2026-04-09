"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "section-overview", label: "Overview" },
  { id: "section-performance", label: "Performance" },
  { id: "section-insights", label: "Insights" },
] as const;

export function AnalyticsSectionNav() {
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
      for (const section of [...SECTIONS].reverse()) {
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
        {SECTIONS.map((section) => (
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
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
}
