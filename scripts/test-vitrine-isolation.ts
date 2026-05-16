import "dotenv/config";
import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db";
import { meuLinkConfigs, properties } from "../src/db/schema";
import { assertCanCreateProperty } from "../src/lib/plans";
import { getPropertyPublicBySlug } from "../src/server-fns/properties";
import {
  check,
  cleanupPrefix,
  createAccount,
  createMeuLink,
  createProperty,
} from "./test-critical-utils";

const PREFIX = "TEST_VITRINE_ISOLATION";
const failures = { count: 0 };

async function propertiesBySlug(slug: string) {
  const [config] = await db
    .select({ userId: meuLinkConfigs.userId })
    .from(meuLinkConfigs)
    .where(eq(meuLinkConfigs.slug, slug))
    .limit(1);
  if (!config?.userId) return [];
  return db
    .select()
    .from(properties)
    .where(and(eq(properties.brokerId, config.userId), eq(properties.status, "Disponível")));
}

async function main() {
  await cleanupPrefix(PREFIX);
  try {
    const a = await createAccount(PREFIX, "A", "free");
    const b = await createAccount(PREFIX, "B", "pro");
    await createMeuLink(a);
    await createMeuLink(b);
    const aProps = await Promise.all([1, 2, 3].map((i) => createProperty(a, i)));
    const bProps = await Promise.all([1, 2, 3, 4].map((i) => createProperty(b, i)));

    await check("slug A mostra só imóveis do corretor A", async () => {
      const rows = await propertiesBySlug(a.slug);
      assert.equal(rows.length, 3);
      assert.ok(rows.every((row) => row.brokerId === a.userId));
    }, failures);

    await check("slug B mostra só imóveis do corretor B", async () => {
      const rows = await propertiesBySlug(b.slug);
      assert.equal(rows.length, 4);
      assert.ok(rows.every((row) => row.brokerId === b.userId));
    }, failures);

    await check("propertyId de B usando slug A retorna null/404", async () => {
      const wrong = await getPropertyPublicBySlug(a.slug, bProps[0].id);
      assert.equal(wrong, null);
      const right = await getPropertyPublicBySlug(a.slug, aProps[0].id);
      assert.equal(right?.id, aProps[0].id);
    }, failures);

    await check("Free com 3 imóveis bloqueia o 4º", () => {
      assert.throws(() => assertCanCreateProperty({ planSlug: "free" }, 3));
    }, failures);

    await check("Pro permite 4º imóvel", () => {
      assert.doesNotThrow(() => assertCanCreateProperty({ planSlug: "pro" }, 3));
    }, failures);
  } finally {
    await cleanupPrefix(PREFIX);
  }

  if (failures.count) {
    console.error(`\n${PREFIX}: FAIL (${failures.count})`);
    process.exitCode = 1;
  } else {
    console.log(`\n${PREFIX}: PASS`);
  }
}

await main();

