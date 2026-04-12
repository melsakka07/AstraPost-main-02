"use client";

import { FileQuestion, Inbox, Search, Users, BarChart3, Bot, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateVariant = "default" | "search" | "users" | "analytics" | "ai" | "billing";

interface EmptyStateProps {
  title: string;
  description?: string;
  variant?: EmptyStateVariant;
  action?: React.ReactNode;
  className?: string;
}

const VARIANT_CONFIG: Record<EmptyStateVariant, { icon: React.ElementType; iconClass: string }> = {
  default: { icon: Inbox, iconClass: "text-muted-foreground" },
  search: { icon: Search, iconClass: "text-muted-foreground" },
  users: { icon: Users, iconClass: "text-blue-500" },
  analytics: { icon: BarChart3, iconClass: "text-purple-500" },
  ai: { icon: Bot, iconClass: "text-green-500" },
  billing: { icon: DollarSign, iconClass: "text-amber-500" },
};

export function EmptyState({
  title,
  description,
  variant = "default",
  action,
  className,
}: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-8 text-center sm:py-12",
        className
      )}
    >
      <div className="relative mb-4">
        <div className="bg-muted/50 flex h-16 w-16 items-center justify-center rounded-full">
          <Icon className={cn("h-8 w-8", config.iconClass)} />
        </div>
        <div className="bg-muted absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full">
          <FileQuestion className="text-muted-foreground h-4 w-4" />
        </div>
      </div>
      <h3 className="text-foreground mb-1 text-sm font-semibold">{title}</h3>
      {description && <p className="text-muted-foreground max-w-sm px-2 text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TableEmptyState({
  message = "No data found",
  description,
  variant = "default" as EmptyStateVariant,
}: {
  message?: string;
  description?: string;
  variant?: EmptyStateVariant;
}) {
  return (
    <tr>
      <td colSpan={100} className="p-0">
        <EmptyState
          title={message}
          {...(description !== undefined && { description })}
          variant={variant}
          className="py-8"
        />
      </td>
    </tr>
  );
}
