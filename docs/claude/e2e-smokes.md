# E2E Smokes — Manual-Only Status

The Playwright smokes under `tests/e2e/` are **manual / documentation** as of 2026-05-30. They are **not run in CI** and currently **cannot run reliably against a local or preview server** without a bootstrap fix.

## The smokes

| File                       | Covers                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| `composer-wave5.e2e.ts`    | Composer decomposition — localStorage autosave → restore-draft banner; ⌘K toggles the AI panel      |
| `inspiration-wave6.e2e.ts` | Inspiration decomposition — three tabs render/switch; inline URL-validation gates the import button |
| `rtl-wave6.e2e.ts`         | RTL contract — Arabic locale → `dir="rtl" lang="ar"`, no page errors, sidebar mirrored right        |
| `dashboard-layout.e2e.ts`  | (pre-existing) dashboard layout                                                                     |

## Why they can't run as-is (test-harness, not product)

The shared auth bootstrap (`register` + separate `sign-in/email` via node `fetch`) hits three walls:

1. **Rate limit** — the `auth` bucket is **5 requests / 15 min per IP** (`src/lib/rate-limiter.ts`). The suite needs 6+ auth calls, so it `429`s after ~2.
2. **CSRF/Origin 403** — the node-`fetch` sign-in sends no `Origin` header, so Better Auth's HTTP handler rejects it (`403`, no `Set-Cookie`). Register dodges this because it calls `auth.api.signUpEmail` _internally_ (no HTTP origin check).
3. **autoSignIn cookie not forwarded** — `emailAndPassword.autoSignIn: true` is set, but `src/app/api/auth/register/route.ts` returns `Response.json()` without forwarding the session cookie, so the test can't reuse register's response and is forced into the (403-ing) separate sign-in.

There is also Windows Playwright instability (`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`).

## How the behavior IS verified instead

- **Node unit tests** (372 passing) cover the pure logic these smokes wrap (URL validation in `inspiration-utils.test.ts`, char counting in `tweet-char.test.ts`, composer utils).
- **Manual eyeball** (2026-05-30): RTL/i18n across `/dashboard`, compose, inspiration, ai/writer, settings — confirmed by the maintainer.

## To make them CI-runnable (deferred follow-up)

Fix the bootstrap, then add an `e2e` CI job with a `webServer` block:

- Replace the node-`fetch` register/sign-in with a **browser-driven login** through a real Playwright page (sends correct `Origin` + cookies automatically), **or** add an `Origin` header matching the app base URL to the sign-in fetch.
- Add a **test-only rate-limit bypass** (e.g., skip/raise the `auth` limit when a test header or `NODE_ENV=test`/CI env is present) so the suite doesn't 429.
- Optionally forward the `autoSignIn` Set-Cookie from the register route so a single call establishes the session (also a latent product nicety).
