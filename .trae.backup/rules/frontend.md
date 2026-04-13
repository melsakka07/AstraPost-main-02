---
paths:
  - "src/components/**/*.tsx"
  - "src/app/dashboard/**/*.tsx"
  - "src/app/(marketing)/**/*.tsx"
---

# Frontend Rules

- Use shadcn/ui color tokens (`bg-background`, `text-foreground`) — avoid custom colors
- Support dark mode with Tailwind classes
- Use standard Tailwind CSS utility classes only
- Dashboard pages: always wrap in `<DashboardPageWrapper icon={...} title="..." description="...">`
- Prefer Server Components; add `"use client"` only when needed
- Use existing auth components from `src/components/auth/`
