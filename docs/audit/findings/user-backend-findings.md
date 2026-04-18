# AstraPost User-Facing Backend Audit

**Scope:** API routes supporting user dashboard, AI tools, settings, composition, analytics, and queue management.

---

## Critical Issues (Fix Immediately)

### C-1: Stripe Webhook Constructor Uses Sync API (Node.js Compatibility Risk)

**File:** `src/app/api/billing/webhook/route.ts:954`

**Current:**

```typescript
const event = Stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
```

**Issue:** `constructEvent()` is the synchronous variant. On Vercel Functions (Node.js 18+) this may timeout on large payloads. The Stripe SDK provides `constructEventAsync()` for async construction.

**Impact:** Webhook delivery will fail silently, causing subscription state divergence between Stripe and AstraPost DB.

**Fix:**

```typescript
const event = await Stripe.webhooks.constructEventAsync(
  body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

---

### C-2: Invoice Payment Handler Has Non-Atomic 2-Table Write

**File:** `src/app/api/billing/webhook/route.ts:808–825`

**Current:**

```typescript
// handleInvoicePaymentSucceeded
const updated = await db.update(...).set({ paidAt: now }).where(...);  // Line 808
// ... later ...
await db.insert(invoiceHistory).values(...); // Line 825 — separate transaction
```

**Issue:** Two sequential DB operations with no transaction wrapper. If the process crashes between the update and insert, the invoice is marked paid but the history record is missing. Future reconciliation will be confused.

**Fix:** Wrap both in `db.transaction()`:

```typescript
await db.transaction(async (tx) => {
  await tx.update(...).set({ paidAt: now }).where(...);
  await tx.insert(invoiceHistory).values(...);
});
```

---

### C-3: Webhook Replay Endpoint Simulates Instead of Re-Invoking

**File:** `src/app/api/admin/webhooks/replay/route.ts`

**Current:** The replay endpoint fetches the DLQ record and logs "Replaying event" but never actually calls the event handler again. It only re-inserts into the DLQ.

**Issue:** Admins believe they are replaying failed webhooks but nothing is actually being replayed. The webhook payload sits in DLQ indefinitely.

**Impact:** Failed subscription updates will never recover; admins have no way to force reconciliation.

**Fix:** Fetch the event payload, deserialize, and re-invoke the handler function (or re-POST to the webhook internally):

```typescript
const handler = getHandlerForEventType(record.eventType);
const result = await handler(JSON.parse(record.payload));
```

---

### C-4: PATCH /posts/[postId] Accepts Unvalidated State Changes

**File:** `src/app/api/posts/[postId]/route.ts:91–110`

**Current:**

```typescript
const body = await req.json();
// No Zod validation
const updated = await db.update(posts).set({
  status: body.status, // Any string accepted
  ...
}).where(...);
```

**Issue:** The POST endpoint validates with Zod, but PATCH has zero validation. A user can PATCH `status: "anything"`, bypassing the schema's enum constraint.

**Impact:** Invalid post statuses in DB; corrupted queue state if status is later queried/matched.

**Fix:**

```typescript
const parseResult = PostUpdateSchema.safeParse(body);
if (!parseResult.success) {
  return ApiError.badRequest(parseResult.error.issues);
}
const validated = parseResult.data;
const updated = await db.update(posts).set(validated).where(...);
```

---

## High Severity Issues

### H-1: No Rate Limiting on Auth Routes; 2FA Plugin Never Wired

**File:** `src/lib/auth.ts`

**Issue 1 — Rate Limiting:** Better Auth login and register endpoints are not rate-limited. Brute-force attacks on password login are possible.

**Issue 2 — 2FA:** Schema has `user.twoFactorEnabled` column but the Better Auth configuration never imports or configures the 2FA plugin. The feature is half-built.

**Fix:**

1. Add `rateLimit` config to Better Auth session:

   ```typescript
   session: {
     rateLimit: {
       enabled: true,
       rateLimitWindowMs: 60000,
       maxRequestsPerWindow: 5, // per IP
     }
   }
   ```

2. Wire in 2FA plugin (if intended) or remove schema column if not:

   ```typescript
   import { twoFactor } from "better-auth/plugins";

   export const auth = betterAuth({
     plugins: [twoFactor()],
   });
   ```

---

### H-2: Post Status Update and Tweet Sync in Two Separate Transactions

**File:** `src/app/api/posts/[postId]/route.ts:159–180`

**Current:**

```typescript
// Transaction 1
await db.transaction(async (tx) => {
  await tx.update(posts).set({ status: "published" }).where(...);
});

// Transaction 2 (separate)
if (needsSync) {
  await updateTweetMetadata(postId);
}
```

**Issue:** Between the two transactions, the post appears "published" but the tweet metadata may still be stale. If the process crashes, the tweet record is out of sync with post status.

**Fix:** Combine into single transaction:

```typescript
await db.transaction(async (tx) => {
  await tx.update(posts).set({ status: "published" }).where(...);
  if (needsSync) {
    await updateTweetMetadata(postId, tx);
  }
});
```

---

### H-3: Hardcoded "nano-banana-2" Fallback Model Name

**File:** `src/app/api/ai/image/quota/route.ts:57`

**Issue:** The code hardcodes a fallback model string:

```typescript
const model = process.env.REPLICATE_MODEL_FALLBACK || "nano-banana-2";
```

Per CLAUDE.md rule: _Never hardcode AI model names — env vars only._

**Fix:**

```typescript
const model = process.env.REPLICATE_MODEL_FALLBACK!; // No default
// or require it at startup
```

---

### H-4: Team Invite Route Uses .parse() Instead of .safeParse()

**File:** `src/app/api/team/invite/route.ts:29`

**Current:**

```typescript
const body = InviteSchema.parse(req.json());
```

**Issue:** `.parse()` throws on invalid input; without a try/catch, Zod errors bubble to the outer error handler and return a generic 500 instead of a structured 400 with validation details.

**Fix:**

```typescript
const parseResult = InviteSchema.safeParse(req.json());
if (!parseResult.success) {
  return ApiError.badRequest(parseResult.error.issues);
}
```

---

### H-5: Impersonation Session Delete Bypasses Admin Auth

**File:** `src/app/api/admin/impersonation/[sessionId]/route.ts:30`

**Current:**

```typescript
export async function DELETE(req: Request, { params }: any) {
  // No requireAdminApi() check
  const session = sessions.find((s) => s.id === params.sessionId);
  // Delete directly
}
```

**Issue:** The endpoint does not call `requireAdminApi()`. The `any` cast also indicates type unsafety.

**Impact:** Any authenticated user could end an admin impersonation session.

**Fix:**

```typescript
const admin = requireAdminApi(req);
if (!admin.ok) return admin.response;
// ... proceed with deletion
```

---

### H-6: Account Deletion Has No Stripe Cancel, Rate Limit, or Re-Auth

**File:** `src/app/api/user/delete/route.ts`

**Issues:**

1. No Stripe subscription cancellation — user's subscription persists in Stripe even after account deletion
2. No rate limiting — unlimited deletion requests possible
3. No re-authentication — any authenticated user can trigger their own deletion without re-entering password

**Fix:**

```typescript
// 1. Rate limit
const rateLimitResult = await checkRateLimit(`user-delete:${userId}`);
if (!rateLimitResult.allowed) return createRateLimitResponse(...);

// 2. Re-auth (optional but recommended for critical action)
// Verify password or recent session token

// 3. Cancel Stripe subscription first
if (user.stripeCustomerId) {
  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    limit: 100,
  });
  for (const sub of subscriptions.data) {
    await stripe.subscriptions.cancel(sub.id);
  }
}

// 4. Then delete user
await db.delete(users).where(...);
```

---

## Medium Severity Issues

### M-1: Bulk Post Insert Skips Plan Limit Check

**File:** `src/app/api/posts/bulk/route.ts`

**Issue:** CSV bulk import endpoint does not call `checkPostLimitDetailed()` before inserting. A free-plan user can import 1000 posts in a single request.

**Fix:**

```typescript
const totalPosts = rows.length;
const limitResult = await checkPostLimitDetailed(userId, totalPosts);
if (!limitResult.allowed) {
  return createPlanLimitResponse(limitResult);
}

// Then proceed with insert
```

---

### M-2: Direct State String Assignment on PATCH /posts/[postId]

**File:** `src/app/api/posts/[postId]/route.ts:144`

**Issue:** PATCH accepts `body.status: string` and directly sets it without enum validation:

```typescript
set: {
  status: body.status || undefined, // Could be anything
}
```

**Fix:** Use Zod schema with enum:

```typescript
const PostUpdateSchema = z.object({
  status: z.enum(["draft", "scheduled", "published", "archived"]).optional(),
  // ...
});
```

---

### M-3: AI Model Rotation During In-Flight Predictions

**File:** `src/app/api/ai/image/status/route.ts`

**Issue:** If an env var for `REPLICATE_MODEL_*` changes mid-execution, predictions in-flight will silently use the old model string but the code will expect the new one, causing model mismatch.

**Fix:** Cache the model name at app startup in a constant rather than reading from env each request.

---

### M-4: Public /api/diagnostics Endpoint Reveals Infrastructure Config

**File:** `src/app/api/diagnostics/route.ts`

**Issue:** The endpoint is intentionally public but reveals:

- Whether `POSTGRES_URL`, `BETTER_AUTH_SECRET`, `TWITTER_CLIENT_ID`, `OPENROUTER_API_KEY`, `BLOB_READ_WRITE_TOKEN` are configured
- Whether DB is reachable
- Whether migrations have run

This is useful for internal debugging but is an information-disclosure oracle for attackers.

**Fix:**

```typescript
if (process.env.NODE_ENV === "production") {
  const token = req.headers.get("x-diagnostics-token");
  if (token !== process.env.DIAGNOSTICS_TOKEN) {
    return ApiError.forbidden("Diagnostics unavailable in production");
  }
}
```

---

### M-5: planChangeLog Audit Records Deleted After 1 Year

**File:** `src/app/api/cron/billing-cleanup/route.ts:36–48`

**Current:**

```typescript
// Delete plan change log older than 1 year
await db.delete(planChangeLog).where(lt(planChangeLog.createdAt, oneYearAgo));
```

**Schema comment:** _"inserted at every code path that mutates `user.plan`... for audit trail."_

**Issue:** Audit trails are intended for compliance (SOC 2, GDPR). A 1-year retention is insufficient for many jurisdictions and audit scopes. The cleanup is automatic and uncontrolled.

**Fix:** Make configurable:

```typescript
const retentionDays = parseInt(process.env.PLAN_CHANGE_LOG_RETENTION_DAYS || "2555"); // 7 years default
const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
await db.delete(planChangeLog).where(lt(planChangeLog.createdAt, cutoff));
```

---

### M-6: Better Auth Email/Password Plugin Not Configured

**File:** `src/lib/auth.ts`

**Issue:** The schema has columns for password hashing and email reset, but Better Auth is never configured with `emailAndPassword` plugin. As a result:

- `/register` is a redirect stub with no email signup form
- `/forgot-password` is a redirect stub with no recovery form
- Email-based authentication is unavailable

**Current:** Only Twitter OAuth is functional.

**Fix:** Either:

1. **If email auth is intended:** Add `emailAndPassword({ sendResetPassword: ... })` plugin
2. **If Twitter-only is intended:** Remove the register/forgot-password stubs and document "Twitter OAuth only" on marketing pages

---

## Low Severity Issues

### L-1: Stale Comment References "GPT-4o"

**File:** `src/app/api/ai/image/route.ts:163`

**Comment:**

```typescript
// Auto-generate prompt from tweet content via OpenRouter (GPT-4o).
```

**Issue:** The code uses `process.env.OPENROUTER_MODEL`, not hardcoded GPT-4o. The comment is misleading.

**Fix:** Update comment to:

```typescript
// Auto-generate prompt from tweet content via OpenRouter.
```

---

### L-2: Missing correlationId in Queue Job on PATCH Reschedule

**File:** `src/app/api/posts/[postId]/route.ts:238`

**Current:**

```typescript
await scheduleQueue.add("publish-post", { postId, userId }, ...);
```

**Compare to** `src/app/api/posts/route.ts` which always passes:

```typescript
await scheduleQueue.add("publish-post", { postId, userId, correlationId }, ...);
```

**Issue:** The missing field breaks end-to-end request tracing for PATCH-reschedules. Logs won't correlate.

**Fix:** Fetch correlationId and pass it:

```typescript
const correlationId = getCorrelationId(req);
await scheduleQueue.add("publish-post", { postId, userId, correlationId }, ...);
```

---

### L-3: Dynamic Queue Import Error Not Caught

**File:** `src/app/api/ai/agentic/[id]/approve/route.ts:128–134`

**Current:**

```typescript
const { scheduleQueue } = await import("@/lib/queue/client");
await scheduleQueue.add(...);
```

**Issue:** If the dynamic import throws, it's not caught. The error bubbles to outer `catch` which returns 500. The post was already committed to DB (line 95), so it's orphaned.

**Fix:**

```typescript
try {
  const { scheduleQueue } = await import("@/lib/queue/client");
  await scheduleQueue.add(...);
} catch (queueError) {
  logger.error("queue_enqueue_failed", { postId, error: queueError });
  // Proceed with success but flag that queue failed
  return Response.json({
    success: true,
    queueWarning: "Post saved but not queued — may require manual publish"
  });
}
```

---

### L-4: Missing cache.delete() After Plan Upgrade

**File:** `src/app/api/billing/webhook/route.ts:428`

**Current:** The `handleSubscriptionUpdated` handler updates the user's plan:

```typescript
await db.transaction(async (tx) => {
  await tx.update(users).set({ plan: newPlan }).where(...);
});
// Missing: await cache.delete(`plan:${userId}`);
```

**Compare to:** Other branches like `handleInvoicePaymentFailed` (line 759) correctly call:

```typescript
await cache.delete(`plan:${existingRecord.userId}`);
```

**Issue:** Plan data is cached for 5 minutes. After a Stripe upgrade, the user will see stale plan limits for up to 5 minutes.

**Fix:** Add after the transaction:

```typescript
await cache.delete(`plan:${existingRecord.userId}`);
```

---

## Schema Coverage Check

| Required Table              | Present    | Notes                                                                                 |
| --------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| `session`                   | ✅ Yes     | Line 225; token index present                                                         |
| `verification`              | ✅ Yes     | Line 276; for password reset tokens                                                   |
| `admin_audit_log`           | ✅ Yes     | Line 1344; immutable records                                                          |
| `feature_flags`             | ✅ Yes     | Line 1297                                                                             |
| `promo_codes`               | ✅ Yes     | Line 1242                                                                             |
| `webhook_dead_letter_queue` | ✅ Yes     | Line 820                                                                              |
| `ai_generations`            | ✅ Yes     | Line 644; tracks usage                                                                |
| `webhook_configs`           | ❌ Missing | No table for user-defined outbound webhooks (may be intentional if feature not built) |

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| Critical  | 4      |
| High      | 6      |
| Medium    | 6      |
| Low       | 4      |
| **Total** | **20** |
