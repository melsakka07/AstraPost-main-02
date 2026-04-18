import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: string | Error;
  onRetry?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Error state component for displaying errors in admin pages.
 * Shows error message with optional retry button.
 */
export function ErrorState({
  title = "Failed to load data",
  description,
  error,
  onRetry,
  className,
  children,
}: ErrorStateProps) {
  const errorMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : undefined;

  return (
    <Card
      className={cn(
        "border-red-200/50 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20",
        className
      )}
    >
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <AlertCircle className="text-destructive mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-destructive font-medium">{title}</h3>
            {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
            {errorMessage && (
              <p className="text-destructive/80 mt-2 rounded bg-red-900/10 px-2 py-1 font-mono text-xs break-words">
                {errorMessage}
              </p>
            )}
            {children && <div className="mt-3">{children}</div>}
            {onRetry && (
              <Button size="sm" onClick={onRetry} variant="outline" className="mt-3 gap-2">
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
