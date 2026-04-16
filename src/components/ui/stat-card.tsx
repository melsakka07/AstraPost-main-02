import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  /** Card title / metric label */
  title: string;
  /** Primary display value */
  value: string | number;
  /** Icon component rendered in the icon container */
  icon: React.ComponentType<{ className?: string }>;
  /** Secondary descriptive text shown below the label */
  description?: string;
  /**
   * Optional trend indicator.
   * - "up"      → green TrendingUp icon
   * - "down"    → red TrendingDown icon
   * - "neutral" → no icon
   */
  trend?: "up" | "down" | "neutral";
  /**
   * Optional left-border accent class (e.g. "border-l-emerald-500").
   * When provided the card gets a `border-l-4` accent stripe.
   */
  accentClass?: string;
  /** Icon wrapper background class (e.g. "bg-emerald-500/10"). Defaults to bg-primary/10. */
  iconBgClass?: string;
  /** Icon color class (e.g. "text-emerald-500"). Defaults to text-primary. */
  iconColorClass?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  accentClass,
  iconBgClass = "bg-primary/10",
  iconColorClass = "text-primary",
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        accentClass && `border-l-4 ${accentClass}`,
        className
      )}
    >
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconBgClass)}>
            <Icon className={cn("h-4 w-4", iconColorClass)} />
          </div>
          {trend && trend !== "neutral" && (
            <span className={trend === "up" ? "text-green-500" : "text-destructive"}>
              {trend === "up" ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          <p className="text-foreground text-sm font-medium">{title}</p>
          {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
