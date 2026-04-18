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
        "border-green-500/50 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20",
      defaultTitle: "Resource is active and operational",
    },
    inactive: {
      variant: "secondary",
      icon: <X className="h-3 w-3" />,
      className: "border-gray-300 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/20",
      defaultTitle: "Resource is inactive or disabled",
    },
    error: {
      variant: "destructive",
      icon: <AlertCircle className="h-3 w-3" />,
      className: "bg-red-50 dark:bg-red-950/20",
      defaultTitle: "Resource has encountered an error",
    },
    pending: {
      variant: "outline",
      icon: <Clock className="h-3 w-3" />,
      className:
        "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20",
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
