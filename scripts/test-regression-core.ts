import "dotenv/config";
import assert from "node:assert/strict";
import {
  PLAN_PUBLIC_CATALOG,
  getPlanCapabilities,
  normalizePlanSlug,
} from "../src/lib/plans";
import { fmtBRL } from "../src/lib/money";
import { check } from "./test-critical-utils";

const PREFIX = "TEST_REGRESSION_CORE";
const failures = { count: 0 };

await check("normalizePlanSlug(undefined/null/\"\") = free", () => {
  assert.equal(normalizePlanSlug(undefined), "free");
  assert.equal(normalizePlanSlug(null), "free");
  assert.equal(normalizePlanSlug(""), "free");
}, failures);

await check("normalizePlanSlug(\"comercial\") = comercial_ia", () => {
  assert.equal(normalizePlanSlug("comercial"), "comercial_ia");
}, failures);

await check("getPlanCapabilities free/pro/comercial_ia corretos", () => {
  assert.equal(getPlanCapabilities("free").leadsLimit, 15);
  assert.equal(getPlanCapabilities("free").propertiesLimit, 3);
  assert.equal(getPlanCapabilities("pro").canUseBackgroundImage, true);
  assert.equal(getPlanCapabilities("pro").hasAiAssistant, false);
  assert.equal(getPlanCapabilities("comercial_ia").hasAiAssistant, true);
  assert.equal(getPlanCapabilities("comercial_ia").maxUsers, 15);
}, failures);

await check("fmtBRL/helper monetário não quebra com undefined/null/string", () => {
  assert.doesNotThrow(() => fmtBRL(undefined));
  assert.doesNotThrow(() => fmtBRL(null));
  assert.doesNotThrow(() => fmtBRL(Number.NaN));
  assert.equal(fmtBRL("49700"), "R$ 49.700,00");
}, failures);

await check("catálogo de planos tem exatamente 3 planos", () => {
  assert.equal(PLAN_PUBLIC_CATALOG.length, 3);
  assert.deepEqual(PLAN_PUBLIC_CATALOG.map((plan) => plan.slug), ["free", "pro", "comercial_ia"]);
}, failures);

await check("Comercial IA tem R$497/mês", () => {
  const plan = PLAN_PUBLIC_CATALOG.find((item) => item.slug === "comercial_ia");
  assert.equal(plan?.priceMonthly, 49700);
}, failures);

if (failures.count) {
  console.error(`\n${PREFIX}: FAIL (${failures.count})`);
  process.exitCode = 1;
} else {
  console.log(`\n${PREFIX}: PASS`);
}

