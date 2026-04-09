# Common Task Patterns

## Adding a new dashboard page

1. Create `src/app/dashboard/[route]/page.tsx`
2. Use Server Components by default; `"use client"` only if needed
3. Wrap in `<DashboardPageWrapper icon={...} title="..." description="...">`
4. Add to `sidebarSections` in `src/components/dashboard/sidebar.tsx`

## Adding a new API route

1. Create `src/app/api/[route]/route.ts`
2. Export method handlers (`GET`, `POST`, etc.)
3. Return `Response` objects with `ApiError` for errors
4. Add correlation ID header where appropriate

## Adding authentication to a page

```typescript
import { auth } from "@/lib/auth";
const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/login");
```
