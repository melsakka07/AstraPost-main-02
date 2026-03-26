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

| URL | Purpose |
|-----|---------|
| `/admin/metrics` | Signups chart, MRR estimate, jobs count |
| `/admin/stats` | Platform stats — users, posts, AI usage, queue health |
| `/admin/subscribers` | View, search, edit, ban, or delete all users |
| `/admin/billing` | MRR cards, plan distribution, recent subscription events |
| `/admin/billing/promo-codes` | Create and manage discount codes |
| `/admin/feature-flags` | Toggle platform features on/off |
| `/admin/announcement` | Configure the global dashboard banner |
| `/admin/jobs` | BullMQ job monitor |

---

## Revoking admin access

```sql
UPDATE "user"
SET is_admin = false
WHERE email = 'their@email.com';
```

The change takes effect on the next page load (session is re-validated on every request).

---

## Security notes

- The `proxy.ts` check is a **fast cookie check only** — it does not validate the session. Full validation (`requireAdmin()`) happens inside each admin page and API route.
- There is no admin-specific route in the public UI. The `/admin` path is not linked from the marketing site or the dashboard navigation — it must be navigated to directly.
- To add additional admins you must repeat Step 2 with their email after they have registered.
- Banning an admin user via the Subscribers page will invalidate their sessions and prevent login, but does not remove their `is_admin` flag. Revoke admin access first if needed.
