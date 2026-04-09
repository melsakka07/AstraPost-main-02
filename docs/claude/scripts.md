# Available Scripts

| Command                          | Purpose                                 |
| -------------------------------- | --------------------------------------- |
| `pnpm dev`                       | Start dev server (DON'T run — ask user) |
| `pnpm run worker`                | Start BullMQ background worker          |
| `pnpm build`                     | Run migrations + production build       |
| `pnpm run build:ci`              | Build without database (CI/CD)          |
| `pnpm lint`                      | Run ESLint                              |
| `pnpm typecheck`                 | TypeScript type checking                |
| `pnpm run check`                 | Lint + typecheck together               |
| `pnpm run db:generate`           | Generate database migrations            |
| `pnpm run db:migrate`            | Run database migrations                 |
| `pnpm run db:push`               | Push schema changes                     |
| `pnpm run db:studio`             | Open Drizzle Studio GUI                 |
| `pnpm run db:reset`              | Reset database                          |
| `pnpm test`                      | Run Vitest unit tests                   |
| `pnpm run smoke:full`            | Full smoke test suite                   |
| `pnpm run tokens:rotate`         | Rotate encryption keys                  |
| `pnpm run tokens:encrypt-access` | Encrypt existing plaintext tokens       |
