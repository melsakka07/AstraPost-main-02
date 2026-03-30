# Prompt: Implement X Subscription Tier Detection & Integration for AstraPost

> **Objective:** Retrieve each user's X (Twitter) subscription tier via the X API v2, persist it in the database, and surface it in the UI — laying the groundwork for unlocking longer posts (25,000 characters) for paid X subscribers.

---

## Context & Codebase

You are working on **AstraPost**, a production-ready AI-powered social media scheduling platform. Study the attached `README.md` and `CLAUDE.md` thoroughly before writing any code — they are your source of truth for the tech stack, project structure, architectural rules, and coding conventions.

**Key facts you must internalize:**

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 (strict mode with `exactOptionalPropertyTypes`)
- **Database:** PostgreSQL 18 with Drizzle ORM — schema lives in `src/lib/schema.ts`
- **Auth:** Better Auth — server-side via `auth` from `@/lib/auth`, client-side via `@/lib/auth-client`
- **Session helper:** `src/lib/session.ts`
- **API errors:** Always use `ApiError` from `@/lib/api/errors` — never inline `new Response(JSON.stringify(...))` or `NextResponse.json()`
- **Plan gates:** All plan/quota enforcement goes through `src/lib/middleware/require-plan.ts` via `makeFeatureGate()` — never call `getPlanLimits()` directly in route handlers
- **Multi-table writes:** Must be wrapped in `db.transaction()`
- **X API service:** `src/lib/services/x-api.ts` — handles OAuth tokens, encrypted at rest via AES-256-GCM (`src/lib/security/token-encryption.ts`)
- **X accounts table:** `x_accounts` in `src/lib/schema.ts` — stores connected X accounts with encrypted tokens, follower count, default flag, token expiry
- **Existing character limit:** Currently hardcoded to 280 characters for ALL users regardless of their X subscription status. When exceeded, the app shows: *"X Premium required for long posts. One or more of your tweets exceeds 280 characters..."*
- **UI components:** shadcn/ui + Tailwind CSS 4, dark mode support required
- **State management:** Zustand
- **Validation:** Zod — route-specific schemas in the route file, shared schemas in `src/lib/schemas/common.ts`
- **Testing mandate:** Always run `pnpm lint && pnpm typecheck` after changes
- **Never start the dev server yourself** — if you need dev server output, ask the user

---

## X API v2 — Subscription Tier Retrieval Specification

### Endpoint

```
GET https://api.twitter.com/2/users/me?user.fields=subscription_type
```

### Authentication

- **Requires OAuth 2.0 User Context** (the authenticated user's own token)
- The `subscription_type` field **only returns a value for the authenticated user** — querying a different user returns `None`
- Use the user's existing encrypted OAuth access token from the `x_accounts` table (decrypt it using the existing `token-encryption.ts` utilities)

### Response Shape

```json
{
  "data": {
    "id": "2244994945",
    "name": "Developers",
    "username": "XDevelopers",
    "subscription_type": "PremiumPlus"
  }
}
```

### Possible Values for `subscription_type`

| API Value       | Tier         | Long Posts (25K chars) | Blue Checkmark |
|-----------------|--------------|------------------------|----------------|
| `"None"`        | Free         | ❌ No                  | ❌ No          |
| `"Basic"`       | Basic ($3/mo)| ✅ Yes                 | ❌ No          |
| `"Premium"`     | Premium ($8/mo)| ✅ Yes               | ✅ Yes         |
| `"PremiumPlus"` | Premium+ ($16–40/mo)| ✅ Yes          | ✅ Yes         |

### Critical Limitations

1. **Privacy constraint:** The field only returns a value for the *authenticated* user's own token. You cannot look up another user's subscription tier.
2. **Propagation delay:** There may be a short delay between a user purchasing a subscription on X and the API reflecting it. Account for this with appropriate UI messaging.
3. **Token validity:** The access token must be valid and not expired. Handle 401 responses gracefully and prompt reconnection if needed.

---

## Implementation Plan — Execute in Order

### Phase 1: Database Schema Update

**File:** `src/lib/schema.ts`

Add the following columns to the `x_accounts` table:

```typescript
xSubscriptionTier: varchar("x_subscription_tier", { length: 20 }).default("None"),
xSubscriptionTierUpdatedAt: timestamp("x_subscription_tier_updated_at"),
```

**Column design rationale:**
- `x_subscription_tier` — stores the raw API value: `"None"`, `"Basic"`, `"Premium"`, or `"PremiumPlus"`. Defaults to `"None"` so existing rows are safe.
- `x_subscription_tier_updated_at` — tracks when the tier was last fetched, enabling staleness checks and refresh logic.

**After modifying the schema:**
```bash
pnpm run db:generate
pnpm run db:migrate
```

Ensure the migration is additive (new columns with defaults) so it's non-breaking for existing data.

---

### Phase 2: X API Service — Subscription Tier Fetcher

**File:** `src/lib/services/x-api.ts`

Add a new method to the existing X API service class/module:

```typescript
async function fetchXSubscriptionTier(xAccountId: string): Promise<{
  subscriptionTier: "None" | "Basic" | "Premium" | "PremiumPlus";
  username: string;
}>
```

**Implementation requirements:**

1. Look up the `x_accounts` row by `xAccountId` to get the encrypted access token.
2. Decrypt the access token using the existing `token-encryption.ts` utility (`decryptToken` or equivalent).
3. Make a GET request to `https://api.twitter.com/2/users/me?user.fields=subscription_type` with the `Authorization: Bearer <decryptedToken>` header.
4. Parse the response and extract `subscription_type` from `data`.
5. Handle error cases:
   - **401 Unauthorized:** Token expired — return a structured error indicating the user must reconnect their X account.
   - **429 Rate Limited:** Respect `x-rate-limit-reset` header — return a retry-after indicator.
   - **Network errors:** Log via the structured logger (`@/lib/logger`) and return a graceful error.
   - **Missing/null `subscription_type`:** Default to `"None"`.
6. Update the `x_accounts` row with the fetched `x_subscription_tier` and set `x_subscription_tier_updated_at` to `new Date()`.
7. Return the tier value.

**Important:** Follow the existing patterns in `x-api.ts` for how HTTP requests are made, how tokens are decrypted, and how errors are handled. Do not introduce new HTTP client libraries — use whatever the existing service uses (likely `fetch`).

---

### Phase 3: API Route — Fetch & Store Subscription Tier

**File:** `src/app/api/x/subscription-tier/route.ts`

Create a new API route:

```
GET /api/x/subscription-tier?accountId={xAccountId}
```

**Request:**
- Query parameter: `accountId` (UUID of the connected X account from `x_accounts`)
- Validate with Zod

**Response (200):**
```json
{
  "subscriptionTier": "Premium",
  "updatedAt": "2026-03-30T12:00:00.000Z"
}
```

**Implementation requirements:**

1. Authenticate the user via Better Auth session (`auth.api.getSession()`).
2. Validate that the `accountId` belongs to the authenticated user (ownership check — critical security requirement).
3. Call `fetchXSubscriptionTier()` from the X API service.
4. Return the subscription tier and the updated timestamp.
5. Use `ApiError` for all error responses:
   - `ApiError.unauthorized()` if no session
   - `ApiError.notFound("X account")` if account doesn't exist or doesn't belong to user
   - `ApiError.forbidden()` if ownership check fails
   - Appropriate error for token expiry or rate limiting

**Optional — Auto-fetch on account connection:**
Consider also triggering the subscription tier fetch during the X OAuth callback flow (when a user first connects their X account), so the tier is available immediately without requiring a separate API call. Look at the existing OAuth callback handler in `src/app/api/auth/[...all]/route.ts` or the Better Auth `databaseHooks` to find the right hook point.

---

### Phase 4: API Route — Batch Refresh (for Settings Page)

**File:** `src/app/api/x/subscription-tier/refresh/route.ts`

Create a batch refresh endpoint:

```
POST /api/x/subscription-tier/refresh
```

**Request body:**
```json
{
  "accountIds": ["uuid-1", "uuid-2"]
}
```

**Purpose:** Allow the settings page to refresh subscription tiers for all connected X accounts at once. This is useful when a user upgrades their X subscription and wants to see the change reflected.

**Implementation:**
1. Authenticate and validate ownership of all account IDs.
2. Fetch subscription tier for each account (sequentially to respect rate limits).
3. Return updated tiers for all accounts.
4. Add a cooldown/rate-limit check using the `x_subscription_tier_updated_at` column — skip accounts refreshed within the last 15 minutes to avoid unnecessary API calls.

---

### Phase 5: Frontend — Subscription Tier Badge in UI

Display a small colored circle indicator next to each connected X account showing their subscription status.

#### 5A: Badge Component

**File:** `src/components/settings/x-subscription-badge.tsx`

Create a small, reusable badge component:

```typescript
interface XSubscriptionBadgeProps {
  tier: "None" | "Basic" | "Premium" | "PremiumPlus" | null;
  size?: "sm" | "md"; // default "sm"
}
```

**Visual design:**
| Tier         | Circle Color | Tooltip Text               |
|--------------|-------------|----------------------------|
| `None`/`null`| Gray        | "Free X account"           |
| `Basic`      | Yellow      | "X Basic subscriber"       |
| `Premium`    | Blue        | "X Premium subscriber ✓"   |
| `PremiumPlus`| Blue (gold ring) | "X Premium+ subscriber ✓✓" |

**Requirements:**
- Render as a small filled circle (8px for `sm`, 12px for `md`) using Tailwind classes.
- Use a `Tooltip` from shadcn/ui to show the label on hover.
- Support dark mode — colors should be visible on both light and dark backgrounds.
- Gray circle for `None`: `bg-muted-foreground/40`
- Yellow circle for `Basic`: `bg-yellow-500`
- Blue circle for `Premium`: `bg-blue-500`
- Blue with gold ring for `Premium+`: `bg-blue-500 ring-2 ring-yellow-400`

#### 5B: Integrate Badge into Connected X Accounts List

**File:** `src/components/settings/connected-x-accounts.tsx`

Modify the existing connected X accounts component to:

1. Display the `XSubscriptionBadge` next to each account's username/display name.
2. Add a "Refresh" button (small, subtle) that calls `POST /api/x/subscription-tier/refresh` for the account.
3. Show a loading spinner on the badge while refreshing.
4. After refresh, update the local state with the new tier value.
5. If the tier has never been fetched (`xSubscriptionTierUpdatedAt` is null), automatically trigger a fetch on component mount.

#### 5C: Include Subscription Tier in Existing Data Flows

Ensure the subscription tier data flows through existing endpoints that return X account information. Check these files and add `xSubscriptionTier` to their response shapes:

- `src/app/api/x/route.ts` (if it returns account list)
- Any endpoint the composer uses to load account data
- The settings page data loader

The goal is that any component rendering X account info already has the tier available without a separate API call.

---

### Phase 6: Type Safety & Validation

**File:** `src/lib/schemas/common.ts` (if shared) or inline in route files (if route-specific)

Add a Zod enum for the subscription tier:

```typescript
export const xSubscriptionTierEnum = z.enum(["None", "Basic", "Premium", "PremiumPlus"]);
export type XSubscriptionTier = z.infer<typeof xSubscriptionTierEnum>;
```

Add a helper function in an appropriate utility file:

```typescript
export function canPostLongContent(tier: XSubscriptionTier | null): boolean {
  return tier === "Basic" || tier === "Premium" || tier === "PremiumPlus";
}

export function getMaxCharacterLimit(tier: XSubscriptionTier | null): number {
  return canPostLongContent(tier) ? 25_000 : 280;
}
```

These helpers will be used in the **next phase** (not this implementation) to dynamically adjust character limits in the composer — but define them now so the logic is centralized and tested.

---

### Phase 7: Verification Tests (Vitest)

Add lightweight unit tests to confirm the core logic works. Follow the project's existing test patterns — tests are co-located with implementation files (e.g., `x-api.test.ts` already exists). Run with `pnpm test`.

#### 7A: Helper Function Tests

**File:** `src/lib/services/x-subscription.test.ts` (or co-locate near wherever the helpers land)

Test `canPostLongContent()` and `getMaxCharacterLimit()`:

```
- canPostLongContent("None")        → false
- canPostLongContent(null)          → false
- canPostLongContent("Basic")       → true
- canPostLongContent("Premium")     → true
- canPostLongContent("PremiumPlus") → true
- getMaxCharacterLimit("None")      → 280
- getMaxCharacterLimit(null)        → 280
- getMaxCharacterLimit("Basic")     → 25_000
- getMaxCharacterLimit("Premium")   → 25_000
- getMaxCharacterLimit("PremiumPlus")→ 25_000
```

#### 7B: Zod Schema Validation Tests

**File:** same test file or `src/lib/schemas/common.test.ts`

Verify `xSubscriptionTierEnum` accepts valid values and rejects invalid ones:

```
- parse("None")         → succeeds
- parse("Basic")        → succeeds
- parse("Premium")      → succeeds
- parse("PremiumPlus")  → succeeds
- parse("free")         → throws ZodError
- parse("")             → throws ZodError
- parse(null)           → throws ZodError
```

#### 7C: API Response Parsing Test

**File:** `src/lib/services/x-api.test.ts` (add to existing test file)

Mock the X API response and verify `fetchXSubscriptionTier()` correctly extracts and returns the tier value. Test these cases:

1. **Valid response** — `subscription_type: "Premium"` → returns `{ subscriptionTier: "Premium" }`
2. **Null/missing field** — `subscription_type` absent or `None` → returns `{ subscriptionTier: "None" }`
3. **401 response** — throws/returns an error indicating token expiry (verify the error shape, not the HTTP call itself)

Keep tests fast — mock `fetch` and the database layer, don't make real API calls or DB writes. The goal is to verify parsing logic, tier mapping, and error branching — not integration.

---

## Architectural Rules — MUST Follow

These rules come directly from the project's `CLAUDE.md` and `README.md`. Violations will cause bugs or break the build:

1. **`ApiError` for all error responses** — never `new Response(JSON.stringify(...))` or `NextResponse.json()` with error status codes.
2. **`db.transaction()` for multi-table writes** — if you write to `x_accounts` AND any other table in the same request, wrap in a transaction.
3. **Never call `getPlanLimits()` in route handlers** — use `require-plan.ts` helpers if plan gating is needed.
4. **`exactOptionalPropertyTypes`** — use `{...(val !== undefined && { prop: val })}` for optional props, never `prop={maybeUndefined}`.
5. **Server Components by default** — only add `"use client"` when the component genuinely needs client-side interactivity.
6. **Tailwind + shadcn/ui color tokens** — use `bg-background`, `text-foreground`, etc. Support dark mode.
7. **Structured logger** — use `@/lib/logger` for logging, not `console.log`.
8. **Run `pnpm lint && pnpm typecheck` after all changes** — fix any errors before considering the task complete.
9. **Never start the dev server** — ask the user if you need runtime output.
10. **DashboardPageWrapper** — if you create any new dashboard page, wrap it in `<DashboardPageWrapper>`.

---

## Deliverables Checklist

After implementation, verify each item:

- [ ] **Schema migration** — `x_subscription_tier` and `x_subscription_tier_updated_at` columns added to `x_accounts`, migration generated and applied
- [ ] **X API service method** — `fetchXSubscriptionTier()` added to `x-api.ts` with proper token decryption, error handling, and DB update
- [ ] **GET `/api/x/subscription-tier`** — route created with auth, ownership validation, Zod schema, and `ApiError` usage
- [ ] **POST `/api/x/subscription-tier/refresh`** — batch refresh route with cooldown logic
- [ ] **`XSubscriptionBadge` component** — renders colored circle with tooltip, supports all 4 tiers + null, dark mode compatible
- [ ] **Connected X Accounts updated** — badge displayed inline, refresh button functional, auto-fetch on mount for accounts without tier data
- [ ] **Subscription tier included in X account data responses** — existing endpoints return the new field
- [ ] **`xSubscriptionTierEnum` Zod schema** — defined in `common.ts`
- [ ] **`canPostLongContent()` and `getMaxCharacterLimit()` helpers** — defined, exported, ready for the next phase
- [ ] **Vitest tests pass** — helper functions, Zod schema validation, and API response parsing all covered; `pnpm test` passes
- [ ] **TypeScript strict mode passes** — no `any` types, no `exactOptionalPropertyTypes` violations
- [ ] **`pnpm lint && pnpm typecheck && pnpm test`** — all three pass cleanly with zero errors

---

## What NOT To Do in This Phase

- **Do NOT change the character limit logic yet.** The composer should still enforce 280 characters for everyone. The character limit enhancement (using `getMaxCharacterLimit()`) is the next phase — this phase only collects and displays the subscription tier data.
- **Do NOT modify the existing warning message** about 280 characters. It stays as-is until the next phase.
- **Do NOT add new npm packages** unless absolutely necessary. Use `fetch` for HTTP requests (already used in the codebase).
- **Do NOT create a cron job or background worker** for tier refresh — that's a future optimization. For now, fetch on-demand (on account connection + manual refresh).

---

## Summary

This implementation adds the data layer and UI indicator for X subscription tiers. Once complete, we will have:

1. **Every connected X account's subscription tier stored in the database** and refreshable on demand.
2. **A visual badge** in the settings page showing the user's X subscription status at a glance.
3. **Utility functions** (`canPostLongContent`, `getMaxCharacterLimit`) ready to power the next phase: dynamically adjusting the composer's character limit from 280 to 25,000 for eligible accounts.

Implement all phases in order. After each phase, run `pnpm lint && pnpm typecheck` to verify correctness before moving on. After Phase 7, run `pnpm test` to confirm all tests pass.
