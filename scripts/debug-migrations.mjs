import "dotenv/config";
import pg from "pg";

const { Client } = pg;
const client = new Client({ connectionString: process.env.POSTGRES_URL });
await client.connect();
try {
  const r = await client.query(
    "SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 20"
  );
  console.log(`Applied migrations (most recent first): ${r.rows.length}`);
  for (const row of r.rows)
    console.log(`  id=${row.id} hash=${row.hash.slice(0, 16)}... ts=${row.created_at}`);
  const t = await client.query("SELECT to_regclass('public.pdf_thread_jobs') AS t");
  console.log("pdf_thread_jobs exists:", t.rows[0].t);
  const c = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_generations' AND column_name='model'"
  );
  console.log("ai_generations.model exists:", c.rows.length > 0);
  const enumExists = await client.query(
    "SELECT 1 FROM pg_type WHERE typname = 'ai_generation_type'"
  );
  if (enumExists.rows.length === 0) {
    console.log("ai_generation_type ENUM does not exist");
  } else {
    const e = await client.query(
      "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.ai_generation_type'::regtype ORDER BY enumlabel"
    );
    console.log("ai_generation_type values:", e.rows.map((x) => x.enumlabel).join(", "));
  }
  const typeColType = await client.query(
    "SELECT data_type, udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_generations' AND column_name='type'"
  );
  console.log("ai_generations.type:", typeColType.rows[0]);
} finally {
  await client.end();
}
