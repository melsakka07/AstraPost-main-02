import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface DashboardPageWrapperProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardPageWrapper({
  icon: Icon,
  title,
  description,
  actions,
  children,
  className
}: DashboardPageWrapperProps) {
  return (
    <div className={`mx-auto w-full max-w-7xl space-y-6 md:space-y-8 ${className || ""}`}>
      {/* Header with Icon Badge */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 sm:h-12 sm:w-12">
            <Icon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-page-title">{title}</h1>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground sm:mt-1">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}

interface SimplePageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function SimplePageHeader({ title, description, actions }: SimplePageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-page-title">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground sm:mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
