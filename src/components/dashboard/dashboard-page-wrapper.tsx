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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
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
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
