# Admin Dashboard Access

## How it works

The admin panel at `/admin` is protected by **two layers**:

1. **`src/proxy.ts`** — checks that a session cookie exists. Anyone without a cookie is redirected to `/login`.
2. **`src/lib/admin.ts` → `requireAdmin()`** — checks that `user.isAdmin === true` on the authenticated user record. Anyone without the flag is redirected to `/dashboard`.

There is no admin-specific login page. You log in through the normal `/login` page with your regular account credentials, and access is granted based on the `is_admin` column in the `user` table.

---

## Step-by-step: granting yourself admin access

> **Do this once** after your first deployment or during local setup. You only need a working database connection.

### Step 1 — Register or identify your account

If you have not registered yet, go to `/register` and create your account normally.

Note your email address.

### Step 2 — Set `is_admin = true` in the database

Connect to your PostgreSQL database and run:

```sql
UPDATE "user"
SET is_admin = true
WHERE email = 'your@email.com';
```

**Local dev** (with `pnpm run db:studio` — Drizzle Studio):

1. Run `pnpm run db:studio` in your terminal.
2. Open the Drizzle Studio URL shown (usually `http://localhost:4983`).
3. Navigate to the `user` table.
4. Find your row, click to edit it, and set `is_admin` to `true`.
5. Save.

**Production (Neon / Vercel Postgres)**:

- Open your database console in the Neon dashboard or run the SQL above via `psql` / any DB client pointed at `POSTGRES_URL`.

### Step 3 — Log in

1. Go to `/login`.
2. Sign in with the email and password you used in Step 1.
3. After login you will land on `/dashboard` as usual.

### Step 4 — Navigate to the admin panel

Go to `/admin` directly (or add `/admin` to the URL).

You will be redirected to `/admin/metrics` — the admin dashboard home.

---

## Admin sidebar pages

| URL                          | Purpose                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `/admin/metrics`             | Signups chart, MRR estimate, jobs count                  |
| `/admin/stats`               | Platform stats — users, posts, AI usage, queue health    |
| `/admin/subscribers`         | View, search, edit, ban, or delete all users             |
| `/admin/billing`             | MRR cards, plan distribution, recent subscription events |
| `/admin/billing/promo-codes` | Create and manage discount codes                         |
| `/admin/feature-flags`       | Toggle platform features on/off                          |
| `/admin/announcement`        | Configure the global dashboard banner                    |
| `/admin/jobs`                | BullMQ job monitor                                       |

---

## Revoking admin access

```sql
UPDATE "user"
SET is_admin = false
WHERE email = 'their@email.com';
```

The change takes effect on the next page load (session is re-validated on every request).

---

## Manual Plan Overrides (Admin Comped Accounts)

For admins, partners, or special cases, you can grant Pro/Agency access **without requiring a real Stripe subscription** by setting the `plan` column directly on the `user` table.

### How Plan Information Works in AstraPost

There are **two sources** for plan information in the application:

| Source                    | Purpose                    | When Used                                                                                               |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| **`user.plan` column**    | Manual plan override field | Always takes priority; used for admin comped accounts, manual upgrades                                  |
| **`subscriptions` table** | Stripe billing records     | Created when users pay via Stripe checkout; stores `stripeCustomerId`, `stripeSubscriptionId`, `status` |

The application's plan enforcement logic reads from `user.plan` first:

```typescript
// src/lib/plan-limits.ts — effective plan resolution
const effectivePlan = userRow.plan || subscriptionRow.plan || "free";
```

### Granting Manual Pro/Agency Access

To grant a user Pro Monthly access without Stripe:

```sql
UPDATE "user"
SET plan = 'pro_monthly'
WHERE email = 'user@email.com';
```

Available plan values (from `planEnum`):

- `free` — Default free tier
- `pro_monthly` — Pro Monthly plan
- `pro_annual` — Pro Annual plan
- `agency` — Agency plan

### Setting Plan Expiration (Optional)

You can also set an expiration date for manual plans:

```sql
UPDATE "user"
SET plan = 'pro_monthly',
    plan_expires_at = '2026-12-31 23:59:59'::timestamp
WHERE email = 'user@email.com';
```

When `plan_expires_at` is reached, the plan reverts to `free` automatically (handled by middleware).

### Example: Admin Comped Account

For the user `astravision.ai@gmail.com` (admin user, manually configured):

| Field                  | Value                             |
| ---------------------- | --------------------------------- |
| `user.plan`            | `pro_monthly` ← What the app uses |
| `user.plan_expires_at` | `null` (no expiration)            |
| `subscriptions` table  | Empty (no Stripe subscription)    |
| `user.is_admin`        | `true`                            |
| Settings page shows    | `PRO_MONTHLY` ✅                  |

This user has full Pro access without any Stripe billing record.

### Revoking Manual Plan Access

To revert a user to Free:

```sql
UPDATE "user"
SET plan = 'free',
    plan_expires_at = null
WHERE email = 'user@email.com';
```

### Important Notes

- **`user.plan` always wins** — Even if a user has a Stripe subscription in the `subscriptions` table, the `user.plan` column takes precedence for plan enforcement
- **Settings page displays `user.plan`** — The `/dashboard/settings` page shows `user.plan`, not the subscription table
- **For Stripe-paying users** — Leave `user.plan` as `null` or `free`; let the `subscriptions` table control their plan via webhooks
- **Hybrid scenario** — If you set `user.plan = 'agency'` and the user also has a `pro_monthly` Stripe subscription, they get Agency features (the higher tier wins)

---

## Security notes

- The `proxy.ts` check is a **fast cookie check only** — it does not validate the session. Full validation (`requireAdmin()`) happens inside each admin page and API route.
- There is no admin-specific route in the public UI. The `/admin` path is not linked from the marketing site or the dashboard navigation — it must be navigated to directly.
- To add additional admins you must repeat Step 2 with their email after they have registered.
- Banning an admin user via the Subscribers page will invalidate their sessions and prevent login, but does not remove their `is_admin` flag. Revoke admin access first if needed.
