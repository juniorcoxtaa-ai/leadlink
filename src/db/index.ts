import { DATABASE_URL } from "../config.server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;
const g = globalThis as typeof globalThis & { __db?: DbInstance; __pg?: postgres.Sql };
const isDev = process.env.NODE_ENV !== "production";

function createSqlClient() {
  return postgres(DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
    prepare: false,
    onclose(connectionId) {
      if (isDev) {
        console.warn(`[LeadLink][db] postgres connection closed`, { connectionId });
      }
    },
  });
}

if (!g.__pg) {
  g.__pg = createSqlClient();
}
if (!g.__db) {
  g.__db = drizzle(g.__pg, { schema });
}

export const db = g.__db;
