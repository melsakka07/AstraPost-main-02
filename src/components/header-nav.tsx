"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const NAV_LINK_KEYS = [
  { key: "features", href: "/features" },
  { key: "pricing", href: "/pricing" },
  { key: "blog", href: "/blog" },
  { key: "changelog", href: "/changelog" },
] as const;

export function HeaderNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <div className="hidden items-center gap-6 text-sm font-medium md:flex">
      {NAV_LINK_KEYS.map(({ key, href }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "underline-offset-4 transition-colors hover:underline",
              isActive
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(key)}
          </Link>
        );
      })}
    </div>
  );
}
