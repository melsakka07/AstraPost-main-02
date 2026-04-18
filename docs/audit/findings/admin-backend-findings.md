# AstraPost Admin Backend Audit

**Scope:** API routes and backend logic supporting admin pages (user management, billing, feature flags, health, audit, etc.).

---

## Critical Issues

### AD-C-1: User Impersonation Session Delete Bypasses Admin Auth

**File:** `src/app/api/admin/impersonation/[sessionId]/route.ts:30`

**Current:**

```typescript
export async function DELETE(req: Request, { params }: any) {
  // No requireAdminApi() check!
  const session = sessions.find((s) => s.id === params.sessionId);
  // Proceed to delete
}
```

**Issue:** The route does not call `requireAdminApi()`. Any authenticated user can end an admin's impersonation session.

**Impact:** Authentication bypass. Regular users can interfere with admin debugging.

**Fix:**

```typescript
import { requireAdminApi } from "@/lib/admin";

export async function DELETE(req: Request, { params }: { params: { sessionId: string } }) {
  const admin = requireAdminApi(req);
  if (!admin.ok) return admin.response;

  const session = sessions.find((s) => s.id === params.sessionId);
  if (!session) return ApiError.notFound("Session not found");

  // Proceed with delete
  delete sessions[params.sessionId];
  return Response.json({ success: true });
}
```

---

## High Severity Issues

### AD-H-1: Admin Health Check Does Not Verify All Critical Dependencies

**File:** `src/app/admin/health/page.tsx` (+ backend if it exists)

**Issue:** A health check endpoint likely exists but doesn't verify:

- PostgreSQL connectivity and query response time
- Redis connectivity
- BullMQ worker status (is the queue processor running?)
- Stripe API connectivity
- AI provider connectivity (OpenRouter, Replicate)

**Impact:** Admin has no way to proactively detect infrastructure issues. Problems are discovered when users report them.

**Fix:** Create or enhance `/api/admin/health` to check all critical paths:

```typescript
export async function GET(req: Request) {
  const admin = requireAdminApi(req);
  if (!admin.ok) return admin.response;

  const health = {
    status: "ok",
    checks: {
      postgres: { ok: false, latency: 0 },
      redis: { ok: false, latency: 0 },
      bullmq: { ok: false, latency: 0 },
      stripe: { ok: false, latency: 0 },
      openrouter: { ok: false, latency: 0 },
    },
  };

  // Check PostgreSQL
  const start = Date.now();
  try {
    await db.query.users.findFirst();
    health.checks.postgres = { ok: true, latency: Date.now() - start };
  } catch (e) {
    health.checks.postgres = { ok: false, error: e.message };
    health.status = "degraded";
  }

  // Check Redis
  try {
    await redis.ping();
    health.checks.redis = { ok: true, latency: Date.now() - start };
  } catch (e) {
    health.checks.redis = { ok: false, error: e.message };
    health.status = "degraded";
  }

  // Check BullMQ
  try {
    const queueHealth = await scheduleQueue.isPaused();
    health.checks.bullmq = { ok: !queueHealth };
  } catch (e) {
    health.checks.bullmq = { ok: false, error: e.message };
    health.status = "degraded";
  }

  // ... check Stripe, OpenRouter, etc.

  return Response.json(health, {
    status: health.status === "ok" ? 200 : 503,
  });
}
```

---

### AD-H-2: No Rate Limiting on Impersonation/Dangerous Admin Actions

**Files:**

- `src/app/api/admin/impersonation/route.ts` (create)
- `src/app/api/user/delete/route.ts` (delete user)
- `src/app/api/admin/*/override/*` (any override endpoints)

**Issue:** Dangerous operations (creating impersonation sessions, deleting users, overriding subscriptions) are not rate-limited. A compromised admin account could mass-delete users.

**Fix:** Add rate limiting:

```typescript
const result = await checkRateLimit(`admin-action:${adminId}:${action}`);
if (!result.allowed) {
  return createRateLimitResponse(result);
}
```

---

### AD-H-3: Audit Log May Not Capture All Admin Actions

**File:** `src/lib/schema.ts:1344` (admin_audit_log table)

**Issue:** The audit log exists but it's unclear whether all admin-modifying actions insert records. Check that:

- User deletions are logged
- User plan overrides are logged
- Impersonation start/end are logged
- Feature flag changes are logged
- Promo code creation/deletion are logged

If any of these are missing, the audit trail is incomplete.

**Fix:** Audit every admin action before committing to DB:

```typescript
async function logAdminAction(
  adminId: string,
  action: string,
  resource: string,
  details: Record<string, any>
) {
  await db.insert(adminAuditLog).values({
    adminId,
    action,
    resource,
    details: JSON.stringify(details),
    createdAt: new Date(),
  });
}

// Before deleting user
await logAdminAction(adminId, "USER_DELETE", user.id, { email: user.email });
await db.delete(users).where(eq(users.id, user.id));
```

---

### AD-H-4: Feature Flag Changes Not Propagated in Real-Time

**File:** `src/app/admin/feature-flags/page.tsx` (+ backend)

**Issue:** Assuming feature flags are stored in DB, a change on `/admin/feature-flags` updates the DB. But clients may cache flags for 5 minutes. Users won't see the new flag state until cache expires or page reloads.

**Impact:** Admin disables a buggy feature but users still see it for 5 minutes.

**Fix:**

1. Add cache invalidation on flag change:

   ```typescript
   await cache.delete(`feature-flags:${userId}`);
   // Or broadcast to all users
   await broadcastEvent("feature-flags-updated", { flagName });
   ```

2. Implement real-time propagation via WebSocket or Server-Sent Events (if not already done).

---

### AD-H-5: Promo Code Enforcement May Not Be Complete

**File:** `src/app/admin/billing/promo-codes/page.tsx` (+ backend)

**Issues (to verify):**

- Are promo code validity dates enforced? (can't use an expired code?)
- Are usage limits enforced? (code for 10 uses can only be used 10 times?)
- Are discount calculations correct? (percentage vs. fixed amount)
- Can a code be reused by the same user? (should be enforced)

**Fix:** Ensure promo code validation route checks:

```typescript
const code = await db.query.promoCodes.findFirst({
  where: eq(promoCodes.code, userInput),
});

if (!code) return ApiError.notFound("Code not found");
if (new Date() > code.expiresAt) return ApiError.badRequest("Code expired");
if (code.usedCount >= code.maxUses) return ApiError.badRequest("Code limit reached");
if (userId in code.usedByUsers) return ApiError.badRequest("Code already used by you");

// Apply discount
```

---

## Medium Severity Issues

### AD-M-1: Webhook DLQ Replay Only Simulates, Doesn't Re-Invoke

**File:** `src/app/api/admin/webhooks/replay/route.ts`

**Issue:** (Same as C-3 in user backend findings — moved here since it's admin-only)

The replay endpoint logs "Replaying event" but never actually calls the event handler.

**Fix:** (See C-3)

---

### AD-M-2: /admin/users Redirects to /admin/subscribers — Confusing URL Discrepancy

**File:** `src/app/admin/users/page.tsx`

**Current:**

```typescript
export default function UsersPage() {
  redirect("/admin/subscribers");
}
```

**Issue:** URL suggests a distinct "Users" page but it's just a redirect. Creates confusion: "Are users and subscribers different?"

**Fix:** Either:

1. Rename to `/admin/subscribers` throughout and remove the redirect
2. Keep `/admin/users` and don't redirect (be consistent)

---

### AD-M-3: /dashboard/admin/webhooks Not Linked in Admin Sidebar

**File:** `src/app/dashboard/admin/webhooks/page.tsx`

**Issue:** (Same as FL-2 in frontend findings)

The webhook admin page is only reachable via direct URL, not from sidebar navigation.

**Fix:** (See FL-2) Move to `/admin/webhooks` and add sidebar entry.

---

### AD-M-4: No Soft-Delete for User/Content — Hard Delete Is Permanent

**Files:**

- `src/app/api/user/delete/route.ts` (hard delete)
- `src/app/admin/content/page.tsx` (if content deletion exists)

**Issue:** Users and content are hard-deleted from the DB. There's no soft-delete or archive. If an admin accidentally deletes a user or post, recovery is only via database backups (slow, manual, error-prone).

**Impact:** Data loss risk. Users can't be recovered without a full restore operation.

**Fix:** Implement soft-delete:

```typescript
// Add deletedAt column to schema
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  deletedAt: timestamp("deleted_at"),
  // ...
});

// When deleting, just set deletedAt
await db.update(users).set({ deletedAt: new Date() }).where(...);

// Exclude soft-deleted from normal queries
const activeUsers = await db.query.users.findMany({
  where: isNull(users.deletedAt),
});
```

---

### AD-M-5: Impersonation Sessions Have No Automatic Expiration

**File:** Impersonation logic (unclear where sessions are stored)

**Issue:** When an admin impersonates a user, the session is created. But there's no TTL or automatic expiration. If the admin forgets to end the session, the impersonation persists indefinitely.

**Impact:** Security risk. Compromised admin account could impersonate users indefinitely.

**Fix:** Set session TTL:

```typescript
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes
const impersonationSession = {
  id: generateId(),
  adminId,
  userId,
  createdAt: Date.now(),
  expiresAt: Date.now() + SESSION_TTL,
};

// Periodically clean up expired sessions
setInterval(async () => {
  expiredSessions = sessions.filter((s) => s.expiresAt < Date.now());
  expiredSessions.forEach((s) => delete sessions[s.id]);
}, 60 * 1000);
```

---

### AD-M-6: Admin Activity Feed May Not Be Real-Time

**File:** `src/app/admin/page.tsx` (AdminActivityFeed component)

**Issue:** If the activity feed is fetched once on page load, it won't update as new admin actions occur. Admin has a stale view of what's happening.

**Fix:** Implement real-time polling or SSE:

```typescript
// Option 1: Polling
useEffect(() => {
  const interval = setInterval(async () => {
    const newFeed = await fetch("/api/admin/activity-feed?since=" + lastFetchTime);
    setActivity([...newActivity, ...newFeed]);
    setLastFetchTime(Date.now());
  }, 5000);
  return () => clearInterval(interval);
}, []);

// Option 2: SSE
useEffect(() => {
  const sse = new EventSource("/api/admin/activity-feed/stream");
  sse.onmessage = (e) => {
    setActivity((prev) => [JSON.parse(e.data), ...prev]);
  };
  return () => sse.close();
}, []);
```

---

## Low Severity Issues

### AD-L-1: /admin/billing/analytics Pagination May Not Scale to 100K+ Rows

**File:** `src/app/admin/billing/analytics/page.tsx`

**Issue:** If the billing analytics table is queried without server-side pagination, sorting, and filtering, it will:

- Load all rows into memory
- Become slow with 100K+ revenue records
- Fail with "out of memory" error

**Fix:** Implement server-side pagination:

```typescript
const pageSize = 50;
const page = req.query.page || 1;
const offset = (page - 1) * pageSize;

const records = await db.query.invoices.findMany({
  offset,
  limit: pageSize,
  orderBy: desc(invoices.createdAt),
});

const total = await db.query.invoices.count();

return Response.json({
  records,
  total,
  page,
  pageSize,
  pages: Math.ceil(total / pageSize),
});
```

---

### AD-L-2: Feature Flag Page May Not Show Rollout Percentage

**File:** `src/app/admin/feature-flags/page.tsx`

**Issue:** Feature flags typically have a "rollout %" — enable for 10% of users while testing. If the admin page doesn't show or allow setting this, it's a limited feature.

**Fix:** Add rollout percentage input:

```typescript
<Input
  label="Rollout Percentage"
  type="number"
  min="0"
  max="100"
  value={flag.rolloutPercentage}
  onChange={(e) => setRolloutPercentage(Number(e.target.value))}
/>
```

And check it server-side:

```typescript
if (!shouldEnableForUser(flag.rolloutPercentage, userId)) {
  return false;
}
```

---

### AD-L-3: Referral/Affiliate Payout Calculation Not Documented

**Files:**

- `src/app/admin/affiliate/page.tsx`
- `src/app/admin/referrals/page.tsx`

**Issue:** Unclear how referral/affiliate commissions are calculated. Are they:

- Per signup?
- Per subscription renewal?
- A percentage of ARPU?
- Fixed amount?

**Fix:** Document and/or add admin controls for:

- Commission structure (percentage vs. fixed)
- Payout eligibility (min subscribers before payout)
- Payout frequency (monthly, quarterly, on-demand)

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| Critical  | 1      |
| High      | 4      |
| Medium    | 6      |
| Low       | 3      |
| **Total** | **14** |
