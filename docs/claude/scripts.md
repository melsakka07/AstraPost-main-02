# Available Scripts

## Development

| Command              | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `pnpm dev`           | Start Next.js dev server with Turbopack             |
| `pnpm run setup`     | Initial project setup (migrations, env)             |
| `pnpm run env:check` | Validate all required environment variables are set |
| `pnpm run start`     | Start production Next.js server                     |

## Build & Compilation

| Command                    | Purpose                                 |
| -------------------------- | --------------------------------------- |
| `pnpm build`               | Generate migrations + next build        |
| `pnpm run build:ci`        | Next.js build only (skip migrations)    |
| `pnpm run esbuild:rebuild` | Force rebuild esbuild (for native deps) |

## Code Quality

| Command                 | Purpose                            |
| ----------------------- | ---------------------------------- |
| `pnpm lint`             | Run ESLint on all files            |
| `pnpm typecheck`        | TypeScript type checking           |
| `pnpm run check`        | Run lint + typecheck together      |
| `pnpm run format`       | Format code with Prettier          |
| `pnpm run format:check` | Check formatting without modifying |

## Testing

| Command                       | Purpose                                |
| ----------------------------- | -------------------------------------- |
| `pnpm test`                   | Run Vitest unit tests (watch mode)     |
| `pnpm run smoke:e2e`          | Smoke test key flows via API calls     |
| `pnpm run smoke:full`         | Full end-to-end test suite             |
| `pnpm run test:twitter-perms` | Verify Twitter OAuth scopes            |
| `pnpm run test:e2e:ui`        | Playwright UI tests (dashboard layout) |

## Database

| Command                | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `pnpm run db:generate` | Generate Drizzle migrations from schema  |
| `pnpm run db:migrate`  | Run pending migrations                   |
| `pnpm run db:push`     | Push schema changes to database          |
| `pnpm run db:dev`      | Push to dev database (alias for db:push) |
| `pnpm run db:studio`   | Open Drizzle Studio GUI for browsing     |
| `pnpm run db:reset`    | Drop all tables + re-apply migrations    |

## Background Worker

| Command           | Purpose                                |
| ----------------- | -------------------------------------- |
| `pnpm run worker` | Start BullMQ background worker process |

## Token Management

| Command                          | Purpose                            |
| -------------------------------- | ---------------------------------- |
| `pnpm run tokens:rotate`         | Rotate OAuth token encryption keys |
| `pnpm run tokens:encrypt-access` | Encrypt plaintext X access tokens  |

## Template Sync

| Command                  | Purpose                              |
| ------------------------ | ------------------------------------ |
| `pnpm run sync-template` | Sync agentic app templates (dev use) |

---

## Notes

- All scripts with `--require dotenv/config` automatically load `.env` variables
- Database scripts require `POSTGRES_URL` to be set
- Token scripts require `ENCRYPTION_KEY` to be set
- Worker script runs indefinitely until stopped (Ctrl+C)
- `pnpm run check` should pass before committing changes
- For new developers: run `pnpm run setup` after first clone
