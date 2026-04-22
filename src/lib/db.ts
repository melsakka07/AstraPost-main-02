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

const client =
  globalThis._postgresClient ||
  postgres(connectionString, {
    // Fail fast if a new connection can't be established (default is no timeout).
    // Prevents hung requests when the DB container is slow or a connection is stale.
    connect_timeout: 10,
    idle_timeout: process.env.NODE_ENV === "production" ? 60 : 20,
    max_lifetime: process.env.NODE_ENV === "production" ? 1800 : 60,
  });
globalThis._postgresClient = client;

export const db = drizzle(client, { schema });
export const dbClient = client;
