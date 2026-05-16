import "dotenv/config";

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL nao configurada.");
  process.exit(1);
}

const migrationsDir = path.resolve("drizzle");
const sql = postgres(databaseUrl, { max: 1 });

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS "__leadlink_migrations" (
      "name" text PRIMARY KEY,
      "applied_at" timestamp NOT NULL DEFAULT now()
    )
  `;

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const [existing] = await sql`
      SELECT "name" FROM "__leadlink_migrations" WHERE "name" = ${file} LIMIT 1
    `;

    if (existing) {
      console.log(`skip ${file}`);
      continue;
    }

    const migrationSql = await readFile(path.join(migrationsDir, file), "utf8");
    console.log(`apply ${file}`);

    await sql.begin(async (tx) => {
      await tx.unsafe(migrationSql);
      await tx`
        INSERT INTO "__leadlink_migrations" ("name") VALUES (${file})
      `;
    });
  }

  console.log("Migrations aplicadas com sucesso.");
}

main()
  .catch((error) => {
    console.error("Falha ao aplicar migrations:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
