"use client";

import { useEffect, useState } from "react";
import { Bell, CreditCard, Eye, Mic, Twitter, User } from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "accounts", label: "Accounts", icon: Twitter },
  { id: "voice", label: "AI Voice", icon: Mic },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Eye },
] as const;

export function SettingsSectionNav() {
  const [activeSection, setActiveSection] = useState("profile");

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
  }, []);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      aria-label="Settings sections"
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
