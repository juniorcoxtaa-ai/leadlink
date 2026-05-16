import type { db as serverDb } from "./index";

export const db = new Proxy(
  {},
  {
    get() {
      throw new Error("Database access is server-only");
    },
  },
) as typeof serverDb;
