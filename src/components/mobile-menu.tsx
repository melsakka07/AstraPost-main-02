"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Changelog", href: "/changelog" },
] as const;

interface MobileMenuProps {
  isAuthenticated: boolean;
}

export function MobileMenu({ isAuthenticated }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const close = () => setIsOpen(false);

  // Close on Escape key (event-driven, not a setState-in-effect)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger toggle — mobile only */}
      <button
        type="button"
        className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-panel"
      >
        {isOpen ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {/* Backdrop — fixed, z-40 (below header z-50) */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden",
          "transition-opacity duration-200",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Dropdown panel — absolute inside sticky header, top-full = below header */}
      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="false"
        className={cn(
          "absolute left-0 right-0 top-full z-50 border-b bg-background/95 shadow-xl md:hidden",
          "backdrop-blur supports-[backdrop-filter]:bg-background/98",
          "transition-all duration-200 ease-out origin-top",
          isOpen
            ? "visible opacity-100 translate-y-0"
            : "invisible opacity-0 -translate-y-2 pointer-events-none",
        )}
      >
        <nav
          className="container mx-auto px-4 py-5"
          aria-label="Mobile navigation"
        >
          {/* Nav links — onClick closes menu (clean, no useEffect setState) */}
          <ul className="space-y-1" role="list">
            {NAV_LINKS.map(({ label, href }) => {
              const isActive =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={close}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Auth CTAs */}
          <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-4">
            {isAuthenticated ? (
              <Button asChild className="w-full" onClick={close}>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  asChild
                  className="w-full"
                  onClick={close}
                >
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="w-full" onClick={close}>
                  <Link href="/register">Get Started Free</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
