import "dotenv/config";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function fixSessionColumns() {
  try {
    await db.execute(sql`ALTER TABLE session ADD COLUMN IF NOT EXISTS impersonated_by text`);
    await db.execute(
      sql`ALTER TABLE session ADD COLUMN IF NOT EXISTS impersonation_started_at timestamp with time zone`
    );
    console.log("✅ Columns added successfully");
  } catch (e) {
    console.log("Error:", e);
  }
  process.exit(0);
}

fixSessionColumns();
