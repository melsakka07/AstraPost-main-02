# Latest Updates

## 2026-03-13 - AI Image Generation Fix

### Fixed
- Fixed "missing required 'src' property" error in `ai-image-dialog.tsx` by updating `GeneratedImage` interface to match backend response (`imageUrl` vs `url`).
- Fixed accessibility issue in `ai-image-dialog.tsx` by adding `aria-label` to buttons.
- Fixed type errors in `src/app/api/feedback/[id]/upvote/route.ts` (Next.js 15 `params` Promise).
- Fixed type errors in `src/app/api/posts/bulk/route.ts` (Promise return type).
- Fixed and verified unit/integration tests for AI image service and API:
  - `src/lib/services/__tests__/ai-image.test.ts`
  - `src/app/api/ai/image/__tests__/route.test.ts`

### Verified
- Ran `pnpm typecheck` - Passed.
- Ran `vitest` for affected files - Passed.
