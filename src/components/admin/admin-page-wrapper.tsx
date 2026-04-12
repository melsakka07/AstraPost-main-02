// ── Layout Rule ───────────────────────────────────────────────────────────────
// Every page under /admin/ MUST use <AdminPageWrapper> as its root.
// Never wrap an admin page in a raw <div>.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from "react";
import { AdminBreadcrumbs } from "./breadcrumbs";
import type { BreadcrumbItem } from "./breadcrumbs";
import type { LucideIcon } from "lucide-react";

interface AdminPageWrapperProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  children: ReactNode;
}

export function AdminPageWrapper({
  icon: Icon,
  title,
  description,
  actions,
  breadcrumbs,
  children,
}: AdminPageWrapperProps) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {breadcrumbs && breadcrumbs.length > 0 && <AdminBreadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="border-primary/20 bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:h-12 sm:w-12">
            <Icon className="text-primary h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
