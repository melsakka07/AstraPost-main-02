import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var _postgresClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.POSTGRES_URL as string;

if (!connectionString) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

const client = globalThis._postgresClient || postgres(connectionString);
if (process.env.NODE_ENV !== "production") {
  globalThis._postgresClient = client;
}

export const db = drizzle(client, { schema });
export const dbClient = client;
