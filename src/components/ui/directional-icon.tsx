import { cn } from "@/lib/utils";

interface DirectionalIconProps {
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}

/**
 * @deprecated This component is unused across the codebase. Components apply
 * RTL mirroring directly via `rtl:scale-x-[-1]` Tailwind classes instead.
 * Keep for reference; do not add new imports.
 *
 * Renders a directional icon (arrow, chevron) that mirrors horizontally in RTL
 * layouts. Use this for icons that convey a forward/backward direction —
 * ArrowRight, ArrowLeft, ChevronRight, ChevronLeft.
 *
 * @example
 * <DirectionalIcon icon={ArrowRight} className="ms-2 h-4 w-4" />
 */
export function DirectionalIcon({ icon: Icon, className }: DirectionalIconProps) {
  return <Icon className={cn("rtl:scale-x-[-1]", className)} />;
}
