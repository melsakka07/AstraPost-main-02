import type { Config } from "drizzle-kit";
import "dotenv/config";

export default {
  dialect: "postgresql",
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
} satisfies Config;
