import { type SVGProps } from "react";

export interface LogoMarkProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** Size in CSS pixels (sets both width and height). Default 24. */
  size?: number | string;
}

/**
 * AstraPost mark — the sparkle alone. Use for favicons, app icons,
 * collapsed sidebars, X profile pictures, and loading states.
 * Inherits `currentColor`.
 */
export function LogoMark({ size = 24, className, ...props }: LogoMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 56"
      width={size}
      height={size}
      fill="currentColor"
      role="img"
      aria-label="AstraPost"
      className={className}
      {...props}
    >
      <path d="M28 0 Q35 21 56 28 Q35 35 28 56 Q21 35 0 28 Q21 21 28 0 Z" fill="currentColor" />
    </svg>
  );
}
