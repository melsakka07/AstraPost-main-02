// One-off local-dev reconciliation: fix enum/text drift + insert missing migration records.
// Run: node scripts/reconcile-drift.mjs
// This is a local-dev-only script; it does NOT affect production.

import "dotenv/config";
import pg from "pg";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const drizzleDir = path.resolve(__dirname, "..", "drizzle");

const { Client } = pg;
const client = new Client({ connectionString: process.env.POSTGRES_URL });

// ── Schema enum definitions (must match src/lib/schema.ts) ──

const AI_GENERATION_TYPE_VALUES = [
  "thread",
  "image",
  "image_prompt",
  "affiliate",
  "inspiration",
  "inspire",
  "agentic_pipeline",
  "agentic_regenerate",
  "bio_optimizer",
  "content_calendar",
  "tools",
  "hook",
  "cta",
  "rewrite",
  "hashtags",
  "translate",
  "reply_generator",
  "url_to_thread",
  "template",
  "variant_generator",
  "competitor_analyzer",
  "chat",
  "voice_profile",
  "viral_score",
  "trends_discovery",
  "agentic_approve",
  "pdf_to_thread",
];

const AFFILIATE_PLATFORM_VALUES = ["amazon", "noon", "aliexpress", "other"];

// ── Migration hashes (SHA-256 of SQL file content) ──

function sqlFileHash(filename) {
  const content = fs.readFileSync(path.join(drizzleDir, filename), "utf-8");
  return crypto.createHash("sha256").update(content).digest("hex");
}

const MISSING_MIGRATIONS = [
  { tag: "0066_sad_justin_hammer", file: "0066_sad_justin_hammer.sql", ts: 1777729543556 },
  { tag: "0067_soft_dark_beast", file: "0067_soft_dark_beast.sql", ts: 1777752544716 },
  { tag: "0068_tough_chamber", file: "0068_tough_chamber.sql", ts: 1777801429369 },
  { tag: "0069_public_punisher", file: "0069_public_punisher.sql", ts: 1777814126264 },
  { tag: "0070_chunky_wendell_vaughn", file: "0070_chunky_wendell_vaughn.sql", ts: 1777979202758 },
];

// ── Main ──

await client.connect();
console.log("Connected to:", process.env.POSTGRES_URL?.replace(/\/\/.*@/, "//***@"));

try {
  // 1. Create ai_generation_type enum
  console.log("\n1. Creating ai_generation_type enum...");
  const enumExists = await client.query(
    "SELECT 1 FROM pg_type WHERE typname = 'ai_generation_type'"
  );
  if (enumExists.rows.length === 0) {
    const vals = AI_GENERATION_TYPE_VALUES.map((v) => `'${v}'`).join(", ");
    await client.query(`CREATE TYPE ai_generation_type AS ENUM (${vals})`);
    console.log(
      "   Created ai_generation_type enum with",
      AI_GENERATION_TYPE_VALUES.length,
      "values"
    );
  } else {
    console.log("   ai_generation_type enum already exists — skipping");
  }

  // 2. Convert ai_generations.type from text → enum
  console.log("\n2. Converting ai_generations.type from text to ai_generation_type...");
  await client.query(
    "ALTER TABLE ai_generations ALTER COLUMN type TYPE ai_generation_type USING type::ai_generation_type"
  );
  console.log("   Done");

  // 3. Create affiliate_platform enum
  console.log("\n3. Creating affiliate_platform enum...");
  const affEnumExists = await client.query(
    "SELECT 1 FROM pg_type WHERE typname = 'affiliate_platform'"
  );
  if (affEnumExists.rows.length === 0) {
    const vals = AFFILIATE_PLATFORM_VALUES.map((v) => `'${v}'`).join(", ");
    await client.query(`CREATE TYPE affiliate_platform AS ENUM (${vals})`);
    console.log(
      "   Created affiliate_platform enum with",
      AFFILIATE_PLATFORM_VALUES.length,
      "values"
    );
  } else {
    console.log("   affiliate_platform enum already exists — skipping");
  }

  // 4. Convert affiliate_links.platform from text → enum (must drop default first)
  console.log("\n4. Converting affiliate_links.platform from text to affiliate_platform...");
  await client.query("ALTER TABLE affiliate_links ALTER COLUMN platform DROP DEFAULT");
  await client.query(
    "ALTER TABLE affiliate_links ALTER COLUMN platform TYPE affiliate_platform USING platform::affiliate_platform"
  );
  await client.query("ALTER TABLE affiliate_links ALTER COLUMN platform SET DEFAULT 'amazon'");
  console.log("   Done");

  // 5. Insert missing migration records
  console.log("\n5. Inserting missing migration records (0066-0070)...");
  const schemaExists = await client.query(
    "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'drizzle'"
  );
  const tableName =
    schemaExists.rows.length > 0 ? "drizzle.__drizzle_migrations" : "__drizzle_migrations";

  // Get next id
  const maxId = await client.query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM ${tableName}`);
  let nextId = Number(maxId.rows[0].max_id) + 1;

  for (const mig of MISSING_MIGRATIONS) {
    const hash = sqlFileHash(mig.file);
    // Check if already recorded
    const exists = await client.query(`SELECT 1 FROM ${tableName} WHERE hash = $1`, [hash]);
    if (exists.rows.length > 0) {
      console.log(`   ${mig.tag} — already recorded, skipping`);
      continue;
    }
    await client.query(`INSERT INTO ${tableName} (id, hash, created_at) VALUES ($1, $2, $3)`, [
      nextId,
      hash,
      mig.ts,
    ]);
    console.log(
      `   ${mig.tag} — inserted (id=${nextId}, hash=${hash.slice(0, 16)}..., ts=${mig.ts})`
    );
    nextId++;
  }

  console.log("\n✅ Reconciliation complete.");
} catch (err) {
  console.error("❌ Reconciliation failed:", err.message);
  console.error(err);
  process.exit(1);
} finally {
  await client.end();
}
