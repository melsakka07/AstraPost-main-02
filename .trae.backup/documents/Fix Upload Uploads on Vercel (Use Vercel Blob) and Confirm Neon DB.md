## Root Cause
- Vercel’s production filesystem is read-only; writing to `public/uploads` fails with `EROFS`.
- Current code writes directly to local disk (`saveFileLocally` in src/lib/storage.ts:11 and used by src/app/api/uploads/route.ts:85).

## Confirmation: Neon DB
- Your connection string host `ep-sparkling-bar-...-pooler.c-2.us-east-1.aws.neon.tech` indicates a Neon pooled endpoint, so DB is configured to Neon.
- Optional: add a diagnostics route to surface the DB hostname safely for future verification.

## Implementation Plan
1. Storage Provider
- Adopt Vercel Blob (aligns with project docs: "Neon Postgres + Vercel Blob").
- Alternative if preferred: Supabase Storage (I’ll provide envs and bucket instructions below).

2. Env Vars (Vercel Blob)
- In Vercel → Project → Settings → Environment Variables:
  - `BLOB_READ_WRITE_TOKEN=<vercel-blob-token>`

3. Update Storage Layer
- Replace local disk writes with provider-backed uploads:
  - Create/modify a storage helper to:
    - In production: use `@vercel/blob` `put(filename, buffer, { access:"public", token: process.env.BLOB_READ_WRITE_TOKEN })`, return the public URL.
    - In development: optionally keep local fallback to `/public/uploads`.
- Ensure content type mapping (png/jpeg/webp/gif) is set for Blob uploads.

4. Update Upload API
- Switch `src/app/api/uploads/route.ts` from `saveFileLocally(...)` to the new `saveFile(...)` that calls Vercel Blob in prod.
- Keep size/type checks and extension detection as-is.

5. Optional Diagnostics Route
- Add `/api/diagnostics` that returns env presence, DB connectivity, and `dbHost` parsed from `POSTGRES_URL` to quickly confirm Neon in the future.

6. Verify & QA
- Run `pnpm run lint` and `pnpm run typecheck`.
- Deploy, test `/api/uploads` in production; expect 200 and a Blob URL.
- Confirm images appear in the UI (avatars/gallery already consume URLs).

## Alternative: Supabase Storage (if preferred)
- Env vars:
  - `NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
- Create public bucket `uploads` in Supabase Storage.
- Storage helper: upload buffer to `uploads/<uuid>.<ext>`, return `getPublicUrl`.
- Update upload API to use this helper.

## Security
- No credentials leaked in responses. Blob token is server-side.

Please confirm Vercel Blob vs Supabase Storage, and I’ll implement the changes and verify end-to-end.