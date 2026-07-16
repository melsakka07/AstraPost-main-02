"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function AiHistoryCollapsibleCard({ children }: { children: React.ReactNode }) {
  const t = useTranslations("ai_history");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      {!collapsed && children}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={cn(
          "text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1 py-1.5 text-xs transition-colors",
          collapsed && "pt-0"
        )}
      >
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")}
        />
        {collapsed ? t("show_output") : t("hide_output")}
      </button>
    </div>
  );
}
