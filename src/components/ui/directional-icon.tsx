import { cn } from "@/lib/utils";

interface DirectionalIconProps {
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}

/**
 * Renders a directional icon (arrow, chevron) that mirrors horizontally in RTL
 * layouts. Use this for icons that convey a forward/backward direction —
 * ArrowRight, ArrowLeft, ChevronRight, ChevronLeft.
 *
 * @example
 * <DirectionalIcon icon={ArrowRight} className="ml-2 h-4 w-4" />
 */
export function DirectionalIcon({ icon: Icon, className }: DirectionalIconProps) {
  return <Icon className={cn("rtl:scale-x-[-1]", className)} />;
}
