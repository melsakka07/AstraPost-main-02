#!/usr/bin/env node
// Generate SQL to bootstrap drizzle.__drizzle_migrations on a database
// originally built via db:push. Hash algorithm matches drizzle-orm's
// `readMigrationFiles` (sha256 of full UTF-8 file contents).
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const drizzleDir = path.join(__dirname, "..", "drizzle");
const journal = JSON.parse(fs.readFileSync(path.join(drizzleDir, "meta", "_journal.json"), "utf8"));

const rows = journal.entries.map((entry) => {
  const filePath = path.join(drizzleDir, `${entry.tag}.sql`);
  const sql = fs.readFileSync(filePath, "utf8");
  const hash = crypto.createHash("sha256").update(sql).digest("hex");
  return { tag: entry.tag, hash, folderMillis: entry.when };
});

const banner = `-- Bootstrap drizzle.__drizzle_migrations for a db:push'd production DB
-- Generated: ${new Date().toISOString()}
-- Total entries: ${rows.length}
-- Run on production DB ONCE. Idempotent (uses ON CONFLICT DO NOTHING via tag-uniqueness... actually drizzle has no unique constraint on hash, so we guard with NOT EXISTS).
`;

const ddl = `
CREATE SCHEMA IF NOT EXISTS "drizzle";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);
`;

const inserts = rows
  .map(
    (r) =>
      `INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)\n  SELECT '${r.hash}', ${r.folderMillis}\n  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '${r.hash}');\n  -- ${r.tag}`
  )
  .join("\n\n");

const verify = `

-- Verify: should report 66 rows and the highest created_at = ${Math.max(...rows.map((r) => r.folderMillis))}
SELECT COUNT(*) AS migrations_count, MAX(created_at) AS max_created_at
  FROM "drizzle"."__drizzle_migrations";
`;

process.stdout.write(banner + ddl + "\n" + inserts + verify);
