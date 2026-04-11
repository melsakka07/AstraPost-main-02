"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function AdminBreadcrumbs({ items, className }: AdminBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("text-muted-foreground flex items-center gap-1 text-sm", className)}
    >
      <Link
        href="/admin"
        className="hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Admin Home</span>
      </Link>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {item.href && idx < items.length - 1 ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span
              className="text-foreground font-medium"
              aria-current={idx === items.length - 1 ? "page" : undefined}
            >
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
