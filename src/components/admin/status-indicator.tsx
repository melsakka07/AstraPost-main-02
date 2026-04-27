import { CheckCircle2, Clock, AlertCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "active" | "inactive" | "error" | "pending";

interface StatusIndicatorProps {
  status: StatusType;
  label: string;
  title?: string;
  showIcon?: boolean;
}

/**
 * Consistent status indicator component for use across all admin pages.
 * Provides unified colors, icons, and labels for system status display.
 *
 * Status types:
 * - active (green): System/resource is operational
 * - inactive (gray): System/resource is disabled or offline
 * - error (red): System/resource has failed or is in error state
 * - pending (yellow): System/resource is in transition state
 */
export function StatusIndicator({ status, label, title, showIcon = true }: StatusIndicatorProps) {
  const config: Record<
    StatusType,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      icon: React.ReactNode;
      className: string;
      defaultTitle: string;
    }
  > = {
    active: {
      variant: "default",
      icon: <CheckCircle2 className="h-3 w-3" />,
      className:
        "border-success-9/50 text-success-11 dark:text-success-11 bg-success-3 dark:bg-success-3/20",
      defaultTitle: "Resource is active and operational",
    },
    inactive: {
      variant: "secondary",
      icon: <X className="h-3 w-3" />,
      className:
        "border-neutral-7 text-neutral-11 dark:text-neutral-11 bg-neutral-3 dark:bg-neutral-3/20",
      defaultTitle: "Resource is inactive or disabled",
    },
    error: {
      variant: "destructive",
      icon: <AlertCircle className="h-3 w-3" />,
      className: "bg-danger-3 dark:bg-danger-3/20",
      defaultTitle: "Resource has encountered an error",
    },
    pending: {
      variant: "outline",
      icon: <Clock className="h-3 w-3" />,
      className:
        "border-warning-9/50 text-warning-11 dark:text-warning-11 bg-warning-3 dark:bg-warning-3/20",
      defaultTitle: "Resource is in a pending state",
    },
  };

  const { variant, icon, className, defaultTitle } = config[status];

  return (
    <Badge
      variant={variant}
      className={cn("flex w-fit items-center gap-1.5", className)}
      title={title || defaultTitle}
    >
      {showIcon && icon}
      {label}
    </Badge>
  );
}

interface StatusRowProps {
  label: string;
  status: StatusType;
  description?: string;
}

/**
 * Display a status indicator in a row layout with label and optional description.
 * Useful for status lists (e.g., health check details).
 */
export function StatusRow({ label, status, description }: StatusRowProps) {
  return (
    <div className="bg-muted/30 hover:bg-muted/50 flex items-center justify-between rounded-md px-3 py-2 transition-colors">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
      </div>
      <StatusIndicator status={status} label={status.charAt(0).toUpperCase() + status.slice(1)} />
    </div>
  );
}
