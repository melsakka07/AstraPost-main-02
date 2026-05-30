import type { SVGProps } from "react";

export function NoDraftsIllustration({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Document body */}
      <rect x="14" y="10" width="36" height="44" rx="3" />
      {/* Folded corner */}
      <path d="M42 10v6a4 4 0 0 0 4 4h4" />
      <path d="M42 10l8 8" />
      {/* Empty content lines */}
      <line x1="22" y1="26" x2="42" y2="26" strokeDasharray="3 3" opacity="0.4" />
      <line x1="22" y1="34" x2="38" y2="34" strokeDasharray="3 3" opacity="0.4" />
      <line x1="22" y1="42" x2="34" y2="42" strokeDasharray="3 3" opacity="0.4" />
    </svg>
  );
}
