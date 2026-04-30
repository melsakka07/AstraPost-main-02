"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command, Search, ChevronRight, Sun, Moon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { SIDEBAR_SECTIONS } from "@/components/dashboard/sidebar-nav-data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  category: string;
  action?: () => void;
}

export function CommandPalette() {
  const t = useTranslations("command_palette");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { setTheme } = useTheme();

  // Get all navigation items from sidebar
  const navItems: CommandItem[] = SIDEBAR_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      id: item.href,
      label: item.label,
      href: item.href,
      icon: item.icon,
      category: "Navigation",
    }))
  );

  // Theme toggle command
  const themeItems: CommandItem[] = [
    {
      id: "theme:light",
      label: "Light Theme",
      icon: Sun,
      category: "Theme",
      action: () => {
        setTheme("light");
        setOpen(false);
      },
    },
    {
      id: "theme:dark",
      label: "Dark Theme",
      icon: Moon,
      category: "Theme",
      action: () => {
        setTheme("dark");
        setOpen(false);
      },
    },
  ];

  const allItems = [...navItems, ...themeItems];

  // Filter items based on search
  const filteredItems = allItems.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  // Group items by category
  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category]!.push(item);
      return acc;
    },
    {} as Record<string, CommandItem[]>
  );

  // Handle Cmd+K / Ctrl+K
  useKeyboardShortcuts([
    {
      key: "k",
      metaOrCtrl: true,
      handler: () => setOpen(!open),
    },
  ]);

  const handleSelect = (item: CommandItem) => {
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
      setOpen(false);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      {/* Compact icon trigger — visible on mobile/tablet, hidden on lg+ (use ⌘K there) */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("open")}
        className="h-9 w-9 shrink-0 lg:hidden"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[70vh] overflow-hidden p-0 shadow-xl">
          <DialogHeader className="space-y-0 border-b px-4 py-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Command className="h-4 w-4" />
              {t("title")}
            </DialogTitle>
            <DialogDescription className="text-xs">{t("hint")}</DialogDescription>
          </DialogHeader>

          <div className="border-b px-3 py-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute start-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder={t("placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 pl-8 focus-visible:ring-0"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[calc(70vh-120px)] overflow-y-auto">
            {Object.entries(groupedItems).length === 0 ? (
              <div className="text-muted-foreground p-8 text-center text-sm">
                {t("no_results", { search })}
              </div>
            ) : (
              Object.entries(groupedItems).map(([category, items]) => (
                <div key={category}>
                  <div className="px-4 py-2">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      {category}
                    </p>
                  </div>
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "hover:bg-accent w-full px-4 py-2.5 text-left text-sm transition-colors",
                          "flex items-center justify-between"
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <Icon className="text-muted-foreground h-4 w-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{item.label}</p>
                            {item.description && (
                              <p className="text-muted-foreground truncate text-xs">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0 rtl:scale-x-[-1]" />
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="border-t px-3 py-2 text-end">
            <p className="text-muted-foreground text-xs">
              Press <kbd className="bg-muted rounded px-2 py-1 text-xs font-medium">⌘K</kbd> or{" "}
              <kbd className="bg-muted rounded px-2 py-1 text-xs font-medium">Ctrl+K</kbd> anytime
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
