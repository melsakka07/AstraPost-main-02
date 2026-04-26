"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CreditCard, Eye, Mic, Twitter, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function SettingsSectionNav() {
  const t = useTranslations("settings");
  const [activeSection, setActiveSection] = useState("profile");

  const sections = useMemo(
    () =>
      [
        { id: "profile", label: t("nav.profile"), icon: User },
        { id: "subscription", label: t("nav.subscription"), icon: CreditCard },
        { id: "accounts", label: t("nav.accounts"), icon: Twitter },
        { id: "voice", label: t("nav.ai_voice"), icon: Mic },
        { id: "notifications", label: t("nav.notifications"), icon: Bell },
        { id: "privacy", label: t("nav.privacy"), icon: Eye },
      ] as const,
    [t]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-25% 0px -65% 0px" }
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      aria-label={t("nav.label")}
      className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-16 z-10 -mx-1 snap-x snap-mandatory overflow-x-auto rounded-lg border backdrop-blur-sm"
    >
      <div className="flex min-w-max items-center gap-1 p-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => handleClick(section.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "flex min-h-[44px] snap-start items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
