// ── Layout Rule ───────────────────────────────────────────────────────────────
// Every page under /admin/ MUST use <AdminPageWrapper> as its root.
// Never wrap an admin page in a raw <div>.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface AdminPageWrapperProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminPageWrapper({
  icon: Icon,
  title,
  description,
  actions,
  children,
}: AdminPageWrapperProps) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
