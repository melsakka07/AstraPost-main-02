import type { SVGProps } from "react";

export function NoPostsIllustration({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Quill feather */}
      <path d="M14 48c0 0 4-2 6-8l14-28c2-4 6-6 10-4s6 6 4 10l-16 24" />
      <path d="M24 22c0 0 4-2 12-2" />
      {/* Dashed writing line */}
      <line x1="32" y1="48" x2="52" y2="48" strokeDasharray="3 3" />
      <line x1="32" y1="54" x2="48" y2="54" strokeDasharray="3 3" />
    </svg>
  );
}
