import type { SVGProps } from "react";

export function NoAccountsIllustration({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* User silhouette */}
      <circle cx="26" cy="18" r="8" />
      <path d="M8 58c0-12 8-22 18-22s18 10 18 22" />
      {/* Plus indicator suggesting connection needed */}
      <circle cx="44" cy="44" r="8" opacity="0.5" />
      <line x1="40" y1="44" x2="48" y2="44" />
      <line x1="44" y1="40" x2="44" y2="48" />
    </svg>
  );
}
