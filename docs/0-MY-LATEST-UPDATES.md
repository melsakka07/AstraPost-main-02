# Latest Updates

## 2026-03-14 - MDX Compilation Fix

### Fixed
- Fixed "Unexpected token '<'" runtime error in blog posts by updating `src/lib/blog.ts`:
  - Disabled `jsx` parsing in `mdxOptions` (`jsx: false`) to prevent text patterns like `<45s>` from being interpreted as invalid JSX tags.
  - Added `remark-gfm` plugin to support GitHub Flavored Markdown (tables, strikethrough, etc.) which was missing.
  - Explicitly set `format: 'mdx'`.
- Verified and fixed MDX content in `content/blog/grow-audience-saudi-arabia.mdx` and `content/blog/7-viral-thread-structures.mdx` to ensure problematic patterns like `3x` are wrapped in backticks (code spans) to avoid parsing issues.

### Verified
- Ran `pnpm typecheck` - Passed.
- Verified `remark-gfm` installation and import.

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
