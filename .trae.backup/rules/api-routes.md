---
paths:
  - "src/app/api/**/*.ts"
---

# API Route Rules

- Export HTTP method handlers (`GET`, `POST`, etc.) returning `Response` objects
- Use `ApiError` from `@/lib/api/errors` for ALL error responses:
  ```typescript
  import { ApiError } from "@/lib/api/errors";
  if (!session) return ApiError.unauthorized();
  if (!post) return ApiError.notFound("Post");
  if (!allowed) return ApiError.forbidden("Viewers cannot edit posts");
  ```
- Never use `new Response(JSON.stringify({ error }))` or `NextResponse.json({ error })` inline
- Multi-table writes MUST use `db.transaction()`
- Never call `getPlanLimits()` directly — use `require-plan.ts` gate helpers
- Attach correlation IDs on scheduling-related endpoints via `src/lib/correlation.ts`
- Route-specific Zod schemas live in the route file; shared schemas in `src/lib/schemas/common.ts`
