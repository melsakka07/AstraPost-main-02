import type { SVGProps } from "react";

export function SearchNoResultsIllustration({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Magnifying glass */}
      <circle cx="24" cy="24" r="12" />
      <line x1="33" y1="33" x2="44" y2="44" />
      {/* Small X inside the glass */}
      <line x1="19" y1="19" x2="29" y2="29" opacity="0.5" />
      <line x1="29" y1="19" x2="19" y2="29" opacity="0.5" />
    </svg>
  );
}
