# Bug Fix: Dashboard Navigation Freeze (Polling Component Connection Leak)

**Date:** 2026-04-02
**Severity:** High — rendered the local dev environment unusable after a few page navigations
**Status:** Fixed ✅

---

## Problem Description

After visiting a few pages inside the dashboard (especially `/dashboard/queue`), the entire web app would hang indefinitely. Any page navigation — clicking a sidebar link, pressing the browser back button, or loading a new route — would show an infinite loading spinner and never resolve.

The issue was **100% reproducible in local dev (`localhost:3000`)** but did **not affect production** (`astrapost.vercel.app`). This asymmetry was the key diagnostic clue.

### Symptoms

- First 1–2 dashboard page visits work fine.
- After visiting `/dashboard/queue` (or after ~60–90 seconds on any dashboard page), subsequent navigation hangs forever.
- Refreshing the page (F5) would work temporarily, then hang again after a few more clicks.
- The browser's Network tab showed requests queued/pending indefinitely with no response.
- No JavaScript errors in the browser console.
- The Next.js dev server continued running normally with no errors.

---

## Root Cause Analysis

Three bugs combined to produce the freeze. Each one alone would be tolerable; together they were fatal.

### Bug 1 — `QueueRealtimeListener` had no `AbortController` (primary trigger)

**File:** `src/components/queue/queue-realtime-listener.tsx`

This React component mounts on the `/dashboard/queue` page and polls `/api/queue/sse` every **10 seconds** using `setInterval`. The polling function fetched the endpoint to check for recently published or failed posts.

**The bug:** There was no `AbortController` attached to the fetch call, and no cleanup abort on unmount. When the user navigated away from `/dashboard/queue`, React correctly called the `useEffect` cleanup function which ran `clearInterval` — stopping future polls. However, any request that was **already in flight** at the time of navigation was never cancelled. That in-flight request continued holding a browser connection slot open until the server eventually responded (which could take 68+ seconds — see Bug 3).

Because this component polled every 10 seconds, it was common for 1–2 requests to be in-flight simultaneously after visiting the queue page and navigating away.

### Bug 2 — `NotificationBell` had no `AbortController` (secondary trigger)

**File:** `src/components/dashboard/notification-bell.tsx`

The `NotificationBell` component is present on **every dashboard page** (in the header) and polls `/api/notifications` every **30 seconds**. It had the exact same missing `AbortController` bug.

Because it runs on every dashboard page, it added additional lingering connections on top of those left by `QueueRealtimeListener`. After a few page navigations, multiple stale requests from both components accumulated.

### Bug 3 — `postgres.js` had no connection timeouts (root cause of slow responses)

**File:** `src/lib/db.ts`

The `postgres()` client was initialized with no `connect_timeout` or `idle_timeout`. When the database connection pool contained a stale or broken TCP socket (common in local dev after periods of inactivity), `postgres.js` would attempt to use that socket and wait for the OS-level TCP timeout before declaring failure — typically **30–60 seconds**.

This caused the very first database query in each polling API route (`auth.api.getSession` + a `findMany`) to hang for **68 seconds** on the first poll after a period of inactivity. The slow response was the fuel that kept connections occupied for so long.

### How the three bugs combined

```
[postgres.js stale socket]
  → /api/notifications hangs for 68 s
  → /api/queue/sse hangs for 68 s
  → NotificationBell polls again (no AbortController) → 2nd connection slot occupied
  → QueueRealtimeListener cleanup fires but in-flight request NOT aborted → slot stays occupied
  → After 3-4 cycles: 5-6 of 6 browser connection slots are taken by hung requests
  → All new navigation requests queue in browser → infinite loading spinner
```

### Why production was not affected

| Factor | Local Dev | Production (Vercel) |
|---|---|---|
| HTTP protocol | HTTP/1.1 — **6 connections per origin** | HTTP/2 — **unlimited concurrent streams** |
| DB connection pooling | Direct `postgres.js` sockets — stale sockets hang | PgBouncer — connections are managed, no stale socket issue |
| Network reliability | Loopback, but sockets can go stale after dev server restarts | Managed Postgres with always-fresh connections |

Production uses HTTP/2 (no per-origin connection cap) and PgBouncer (no stale socket problem), so neither bug had any visible effect there.

---

## Changes Made

### 1. `src/components/queue/queue-realtime-listener.tsx`

Added `AbortController` pattern:

- Added `abortRef = useRef<AbortController | null>(null)` to track the current in-flight request.
- At the start of every `poll()` call: `abortRef.current?.abort()` cancels the previous request before starting a new one — ensuring only **one request is ever in flight** at a time.
- Added an **8-second hard timeout** via `setTimeout(() => controller.abort(), 8000)` — if the server doesn't respond within 8 s, the request is aborted and the browser connection slot is freed immediately.
- In the `useEffect` cleanup: `abortRef.current?.abort()` — on unmount or navigation away, the in-flight request (if any) is cancelled immediately.
- `AbortError` is caught and silently ignored (it is expected on timeout or cleanup).
- Removed the old `cancelled` flag pattern (superseded entirely by `AbortController`).

**Before:**
```typescript
async function poll() {
  try {
    const res = await fetch(`/api/queue/sse?since=...`);
    // ...
  } catch { /* silent */ }
}
const id = setInterval(poll, POLL_INTERVAL_MS);
return () => { clearInterval(id); }; // in-flight request NOT cancelled
```

**After:**
```typescript
const abortRef = useRef<AbortController | null>(null);

async function poll() {
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`/api/queue/sse?since=...`, { signal: controller.signal });
    clearTimeout(timeoutId);
    // ...
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error)?.name === "AbortError") return;
  }
}
const id = setInterval(poll, POLL_INTERVAL_MS);
return () => {
  clearInterval(id);
  abortRef.current?.abort(); // cancels any in-flight request immediately
};
```

---

### 2. `src/components/dashboard/notification-bell.tsx`

Applied the identical `AbortController` + timeout + cleanup pattern:

- Added `abortRef = useRef<AbortController | null>(null)`.
- Cancels previous request at the start of each `fetchNotifications()` call.
- 8-second abort timeout.
- Cleanup on unmount: `abortRef.current?.abort()`.
- `AbortError` caught and silently ignored.

---

### 3. `src/lib/db.ts`

Added connection timeout options to the `postgres()` client:

```typescript
const client = globalThis._postgresClient || postgres(connectionString, {
  connect_timeout: 10,  // fail fast (10 s) on stale/broken sockets
  idle_timeout: 20,     // recycle idle connections after 20 s
});
```

- `connect_timeout: 10` — if a new connection cannot be established within 10 seconds (e.g., stale socket, slow container), postgres.js throws immediately instead of waiting for the OS TCP timeout (30–60 s).
- `idle_timeout: 20` — connections that have been idle for 20 seconds are closed and removed from the pool, preventing stale sockets from accumulating during local dev.

---

## Architectural Pattern — Required for All Future Polling

Any `useEffect` that uses `setInterval` or `setTimeout` to repeatedly fetch an API endpoint **must** follow this pattern:

```typescript
const abortRef = useRef<AbortController | null>(null);

useEffect(() => {
  async function poll() {
    // 1. Cancel previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // 2. Hard timeout — free connection slot if server is slow
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch("/api/...", { signal: controller.signal });
      clearTimeout(timeoutId);
      // handle response...
    } catch (error) {
      clearTimeout(timeoutId);
      // AbortError = expected on timeout or cleanup — not a real error
      if ((error as Error)?.name === "AbortError") return;
      // handle real network errors...
    }
  }

  const id = setInterval(poll, INTERVAL_MS);
  void poll(); // run immediately on mount

  return () => {
    clearInterval(id);
    abortRef.current?.abort(); // cancel in-flight request on unmount
  };
}, []);
```

**Why this matters in local dev:** Browsers enforce a limit of **6 concurrent HTTP/1.1 connections per origin**. If polling components accumulate more than 6 hung requests to `localhost:3000`, all navigation freezes. This pattern ensures at most 1 connection is ever used per polling component.

---

## Verification

```
pnpm lint      ✅  (no errors)
pnpm typecheck ✅  (no errors)
```

---

## Files Changed

| File | Change |
|---|---|
| `src/components/queue/queue-realtime-listener.tsx` | Added AbortController + 8s timeout + cleanup abort |
| `src/components/dashboard/notification-bell.tsx` | Added AbortController + 8s timeout + cleanup abort |
| `src/lib/db.ts` | Added `connect_timeout: 10` and `idle_timeout: 20` |
| `docs/0-MY-LATEST-UPDATES.md` | Updated fix entry with both polling components |

---

## Other Polling Components Audited (Not Affected)

During investigation, all other polling patterns in the codebase were reviewed:

- **`BillingSuccessPoller`** — bounded to 15 attempts max, only mounts on `?billing=success` query param. Self-terminating. Not affected.
- **`ai-image-dialog.tsx` status poller** — uses `setTimeout` chaining (not `setInterval`), self-terminating after success/failure. Not affected.

---

## 2026-04-02 Follow-Up Hardening (Round 2)

After additional reproduction attempts, the issue still appeared intermittently in local dev. A second hardening pass was applied to prevent poll endpoints from ever blocking dashboard navigation.

### Additional Root Causes Addressed

1. **Refresh storms on queue updates**
   - `QueueRealtimeListener` called `router.refresh()` once per event inside a loop.
   - If multiple queue events arrived in one poll response, this triggered multiple full RSC refreshes back-to-back.

2. **Poll API routes could still hang if auth/DB got slow**
   - Even with client-side aborts, server-side handlers (`/api/queue/sse`, `/api/notifications`) could still stall on session/query calls.
   - Slow server responses can still create repeated pending requests and degraded navigation UX.

3. **Connection recycling needed environment-aware tuning**
   - A short max lifetime is useful in local dev to flush stale sockets fast, but too aggressive in production can create unnecessary reconnect churn.

### Additional Changes Made

1. **`src/components/queue/queue-realtime-listener.tsx`**
   - Coalesced refresh behavior: now triggers at most **one** `router.refresh()` per poll cycle, even if multiple events are returned.
   - Moved timeout cleanup into `finally` for consistent timer disposal.

2. **`src/app/api/queue/sse/route.ts`**
   - Added bounded execution (`withTimeout`) around team-context resolution and DB query.
   - On timeout/error, route now fails soft with empty events payload instead of hanging.
   - Added input validation for `since` query param (returns 400 for invalid timestamps).
   - Captures `serverTime` once per request to keep cursoring stable for the next poll.
   - Added warning logs for degraded responses.

3. **`src/app/api/notifications/route.ts`**
   - Added bounded execution (`withTimeout`) for session reads and DB operations.
   - GET now fails soft to `[]` on timeout/error to prevent header polling from blocking navigation.
   - PATCH now returns `503` when backend is temporarily unavailable.
   - Added stricter payload handling for `id`/`all` and warning logs on degraded paths.
   - Replaced ad-hoc error responses with `ApiError` helpers.

4. **`src/lib/db.ts`**
   - Kept `connect_timeout: 10`.
   - Made connection lifecycle environment-aware:
     - `idle_timeout`: production `60`, local dev `20`
     - `max_lifetime`: production `1800`, local dev `60`
   - This preserves fast stale-socket rotation in dev while avoiding production reconnect churn.

### Verification (Round 2)

```bash
pnpm run lint && pnpm run typecheck
```

Passed with no errors.

---

## 2026-04-02 Follow-Up Hardening (Round 3)

A deeper runtime audit found another contributor to dashboard hangs: unnecessary repeated session/auth work and serialized DB reads in dashboard server rendering paths.

### Additional Root Causes Addressed

1. **Duplicate session resolution on dashboard layout/page requests**
   - `DashboardLayout` fetched session directly, then `getTeamContext()` fetched session again in the same request.
   - `QueuePage` repeated the same pattern (`getTeamContext()` + separate `getSession()`).

2. **Serialized dashboard layout data fetching**
   - Memberships, failure state, inactive account state, and AI usage were fetched mostly in sequence.
   - During frequent refreshes/navigation this increased tail latency and amplified perceived hangs.

### Additional Changes Made

1. **`src/app/dashboard/layout.tsx`**
   - Removed direct `auth.api.getSession()` call and used `ctx.session` from `getTeamContext()` as the single session source.
   - Moved onboarding shell decision earlier to avoid extra dashboard-only queries on onboarding route.
   - Parallelized dashboard-only reads with `Promise.all`:
     - team memberships
     - failed post probe
     - inactive account probe
     - AI usage fetch (graceful fallback to `null` on error)

2. **`src/app/dashboard/queue/page.tsx`**
   - Removed redundant `auth.api.getSession()` call.
   - Reused `ctx.session.user.id` for `currentUserId`.

### Runtime Validation Performed

- Browser console + network checked in local dev.
- API health validated:
  - `/api/diagnostics` returned `overallStatus: "ok"` with DB/auth connected.
- Database checked directly in Docker Postgres container:
  - `select now(), count(*) from posts` executed successfully.

### Verification (Round 3)

```bash
pnpm test
pnpm run lint && pnpm run typecheck
```

All passed.

---

## 2026-04-02 Follow-Up Hardening (Round 4)

After the freeze was fixed, runtime testing showed many `net::ERR_ABORTED` entries in browser console for dashboard links and polling endpoints.

### Analysis

- `ERR_ABORTED` on `/_rsc` navigation requests is commonly expected in Next.js dev when a navigation is superseded/canceled by another transition.
- However, pollers were also intentionally aborting prior requests every interval tick, which produced additional noise for `/api/notifications` and `/api/queue/sse`.

### Additional Changes Made

1. **`src/components/dashboard/notification-bell.tsx`**
   - Switched from “abort previous on every poll tick” to single-flight polling (`inFlightRef`).
   - Retained timeout and unmount abort safeguards.
   - Added strict `res.ok` checks for notification PATCH actions before optimistic UI updates.

2. **`src/components/queue/queue-realtime-listener.tsx`**
   - Switched from “abort previous on every poll tick” to single-flight polling (`inFlightRef`).
   - Retained timeout and unmount abort safeguards.
   - Coalesced refresh calls with a short timer to reduce transition interference during rapid navigation.

### Verification (Round 4)

```bash
pnpm test
pnpm run lint && pnpm run typecheck
```

All passed.
