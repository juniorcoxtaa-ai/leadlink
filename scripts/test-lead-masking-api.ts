import "dotenv/config";
import assert from "node:assert/strict";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../src/db";
import { leads } from "../src/db/schema";
import { getLeadVisibilityForUser } from "../src/lib/plans";
import {
  assertMasked,
  check,
  cleanupPrefix,
  createAccount,
  createLead,
  maskLeadForPlan,
} from "./test-critical-utils";

const PREFIX = "TEST_LEAD_MASKING";
const failures = { count: 0 };

async function visibleLeads(userId: string, planSlug: "free" | "pro" | "comercial_ia") {
  const rows = await db
    .select()
    .from(leads)
    .where(eq(leads.brokerId, userId))
    .orderBy(desc(leads.createdAt));
  return rows.map((lead, index) => maskLeadForPlan(lead, planSlug, index));
}

async function leadDetail(sessionUserId: string, leadId: string, planSlug: "free" | "pro" | "comercial_ia") {
  const rows = await visibleLeads(sessionUserId, planSlug);
  return rows.find((lead) => lead.id === leadId) ?? null;
}

async function main() {
  await cleanupPrefix(PREFIX);
  try {
    const free = await createAccount(PREFIX, "FREE", "free");
    const pro = await createAccount(PREFIX, "PRO", "pro");
    const ia = await createAccount(PREFIX, "IA", "comercial_ia");
    const other = await createAccount(PREFIX, "OTHER", "free");
    for (const account of [free, pro, ia]) {
      for (let i = 1; i <= 20; i += 1) await createLead(account, i);
    }
    const otherLead = await createLead(other, 1);

    await check("Free lead 1-15 tem dados", async () => {
      const rows = await visibleLeads(free.userId, "free");
      assert.equal(rows[14].isBlocked, false);
      assert.ok(rows[14].phone);
      assert.ok(rows[14].email);
      assert.ok(rows[14].notes);
    }, failures);

    await check("Free lead 16+ não tem dados sensíveis", async () => {
      const rows = await visibleLeads(free.userId, "free");
      assert.equal(rows[15].isBlocked, true);
      assertMasked(rows[15]);
    }, failures);

    await check("Free lead bloqueado não expõe notes/quizAnswers", async () => {
      const rows = await visibleLeads(free.userId, "free");
      const blocked = rows.find((_, index) => getLeadVisibilityForUser({ planSlug: "free" }, index).masked);
      assert.ok(blocked);
      assertMasked(blocked);
    }, failures);

    await check("Pro lead 16+ tem dados completos", async () => {
      const rows = await visibleLeads(pro.userId, "pro");
      assert.equal(rows[15].isBlocked, false);
      assert.ok(rows[15].phone);
      assert.ok(rows[15].quizAnswers);
      assert.ok(rows[15].notes);
    }, failures);

    await check("Comercial IA lead 16+ tem dados completos", async () => {
      const rows = await visibleLeads(ia.userId, "comercial_ia");
      assert.equal(rows[15].isBlocked, false);
      assert.ok(rows[15].phone);
      assert.ok(rows[15].quizAnswers);
      assert.ok(rows[15].notes);
    }, failures);

    await check("detalhe do lead valida brokerId", async () => {
      const wrong = await leadDetail(free.userId, otherLead.id, "free");
      assert.equal(wrong, null);
      const [dbWrong] = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, otherLead.id), eq(leads.brokerId, free.userId)))
        .limit(1);
      assert.equal(dbWrong, undefined);
      const ownRows = await visibleLeads(free.userId, "free");
      const normal = await leadDetail(free.userId, ownRows[0].id, "free");
      assert.equal(normal?.isBlocked, false);
      assert.ok(normal?.phone);
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

