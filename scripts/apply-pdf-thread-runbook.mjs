import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const { Client } = pg;
const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(
  here,
  "..",
  "docs",
  "sql-runbooks",
  "2026-05-05-create-pdf-thread-jobs.sql"
);
const sql = readFileSync(sqlPath, "utf8");

const client = new Client({ connectionString: process.env.POSTGRES_URL });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("Applied:", sqlPath);
  const t = await client.query("SELECT to_regclass('public.pdf_thread_jobs') AS t");
  console.log("pdf_thread_jobs:", t.rows[0].t);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  throw err;
} finally {
  await client.end();
}
