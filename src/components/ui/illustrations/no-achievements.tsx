import type { SVGProps } from "react";

export function NoAchievementsIllustration({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Star shape */}
      <path
        d="M32 8l3.5 10.8h11.4l-9.2 6.7 3.5 10.8L32 29.6l-9.2 6.7 3.5-10.8-9.2-6.7h11.4z"
        opacity="0.35"
      />
      {/* Faint trophy base */}
      <path d="M18 8c-4 0-6 4-4 8c1 2 4 4 6 4" opacity="0.2" />
      <path d="M46 8c4 0 6 4 4 8c-1 2-4 4-6 4" opacity="0.2" />
      <line x1="22" y1="20" x2="42" y2="20" opacity="0.2" />
    </svg>
  );
}
