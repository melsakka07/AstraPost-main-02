## Goal

Confirm the production database on Vercel uses Neon and provide a safe, in-app diagnostic to self-verify connectivity and schema.

## What We Know

- The app reads `POSTGRES_URL` (src/lib/db.ts:5) for DB connectivity and Drizzle also expects this env (drizzle.config.ts:8).
- There’s a Setup Checklist UI that expects `/api/diagnostics` to return env + DB status (src/components/setup-checklist.tsx:49–56, 68–106), but that route is not present.

## Verification (Vercel UI)

- Open Vercel → Project → Settings → Environment Variables.
- Check `POSTGRES_URL` value:
  - Neon URLs typically contain a host ending with `.neon.tech` (e.g., `postgresql://user:pass@<project-id>-pooler.<region>.neon.tech/neondb`).
  - If the host does not include `neon.tech`, it’s probably not Neon.
- If missing or incorrect:
  - Copy the connection string from Neon dashboard → Project → Connection details → “Direct” or “Pooled” connection string.
  - Paste into Vercel `POSTGRES_URL` (Production), redeploy.

## In‑App Diagnostics (Safe)

Implement `/api/diagnostics` that reports:

- `env` flags: presence of `POSTGRES_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPENROUTER_API_KEY`, `NEXT_PUBLIC_APP_URL`.
- `database.connected`: true if a quick query succeeds.
- `database.schemaApplied`: true if a known table exists (e.g., `user`) by attempting a `select ... limit 1`.
- `auth.configured`: true if `BETTER_AUTH_SECRET` exists; `routeResponding`: true by pinging auth route internally.
- `ai.configured`: true if `OPENROUTER_API_KEY` exists.
- `overallStatus`: derive from the above.
- Optionally include a derived `dbHost` string extracted from `process.env.POSTGRES_URL` (only the hostname, no credentials) to visually confirm Neon (e.g., `*.neon.tech`).

### Proposed Route (to add later)

Create `src/app/api/diagnostics/route.ts`:

```
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const env = process.env;
  const has = (k: string) => Boolean(env[k]);
  let connected = false;
  let schemaApplied = false;
  let error: string | undefined;
  let dbHost: string | null = null;
  try {
    const url = env.POSTGRES_URL;
    if (url) {
      const u = new URL(url);
      dbHost = u.hostname;
    }
  } catch {}
  try {
    const rows = await db.select().from(user).limit(1);
    connected = true;
    schemaApplied = Array.isArray(rows);
  } catch (e: any) {
    error = e?.message || String(e);
  }
  const authConfigured = has("BETTER_AUTH_SECRET");
  const aiConfigured = has("OPENROUTER_API_KEY");
  const result = {
    timestamp: new Date().toISOString(),
    env: {
      POSTGRES_URL: has("POSTGRES_URL"),
      BETTER_AUTH_SECRET: authConfigured,
      GOOGLE_CLIENT_ID: has("GOOGLE_CLIENT_ID"),
      GOOGLE_CLIENT_SECRET: has("GOOGLE_CLIENT_SECRET"),
      OPENROUTER_API_KEY: aiConfigured,
      NEXT_PUBLIC_APP_URL: has("NEXT_PUBLIC_APP_URL"),
    },
    database: { connected, schemaApplied, error, dbHost },
    auth: { configured: authConfigured, routeResponding: null },
    ai: { configured: aiConfigured },
    overallStatus: connected && schemaApplied ? "ok" : error ? "error" : "warn",
  };
  return new Response(JSON.stringify(result), { status: 200, headers: { "content-type": "application/json" } });
}
```

## Steps I Will Perform (after approval)

1. Add the `/api/diagnostics` route as above.
2. Deploy or run locally, then visit `/api/diagnostics` in production to confirm `database.dbHost` ends with `.neon.tech`.
3. If not Neon, update Vercel `POSTGRES_URL` with the Neon string and redeploy.
4. Run `pnpm run lint` and `pnpm run typecheck` to validate changes.

## Security Note

- The diagnostics route only returns the DB hostname, not credentials. It’s safe for production checks.

Please confirm, and I’ll implement the diagnostics route and verify Neon on your Vercel deployment.
