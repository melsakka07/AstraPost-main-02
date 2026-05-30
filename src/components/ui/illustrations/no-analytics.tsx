import type { SVGProps } from "react";

export function NoAnalyticsIllustration({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Y axis */}
      <line x1="16" y1="10" x2="16" y2="52" />
      {/* X axis */}
      <line x1="16" y1="52" x2="54" y2="52" />
      {/* Y axis arrow */}
      <polyline points="13,14 16,10 19,14" />
      {/* Dashed bar outlines — empty chart */}
      <rect x="22" y="52" width="6" height="0" rx="1" strokeDasharray="3 3" opacity="0.3" />
      <rect x="32" y="52" width="6" height="0" rx="1" strokeDasharray="3 3" opacity="0.3" />
      <rect x="42" y="52" width="6" height="0" rx="1" strokeDasharray="3 3" opacity="0.3" />
    </svg>
  );
}
