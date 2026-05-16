import "dotenv/config";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { organizations, user } from "../src/db/schema";
import { normalizePlanSlug } from "../src/lib/plans";
import { ensureOrganization } from "../src/server-fns/plans";
import { check, cleanupPrefix, createAccount, ensurePlans } from "./test-critical-utils";

const PREFIX = "TEST_AUTH_SESSION";
const failures = { count: 0 };

async function main() {
  await cleanupPrefix(PREFIX);
  try {
    const planIds = await ensurePlans();
    const withoutOrg = await createAccount(PREFIX, "NO_ORG", "free", { withOrg: false });
    const blocked = await createAccount(PREFIX, "BLOCKED", "pro", { blocked: true });

    await check("usuário sem organizationId recebe/cria organização Free", async () => {
      const orgId = await ensureOrganization(withoutOrg.userId, "Teste sem org");
      const [row] = await db
        .select({ organizationId: user.organizationId })
        .from(user)
        .where(eq(user.id, withoutOrg.userId))
        .limit(1);
      const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
      assert.equal(row?.organizationId, orgId);
      assert.equal(org?.planId, planIds.free);
      assert.equal(org?.subscriptionStatus, "free");
    }, failures);

    await check("usuário com organização ausente não quebra e cai em fallback seguro", async () => {
      const fallbackUser = await createAccount(PREFIX, "FALLBACK", "free", { withOrg: false });
      const [row] = await db.select().from(user).where(eq(user.id, fallbackUser.userId)).limit(1);
      assert.equal(normalizePlanSlug(row?.planSlug), "free");
    }, failures);

    await check("usuário efetivo tem role, organizationId, planSlug e planStatus seguros", async () => {
      const [row] = await db.select().from(user).where(eq(user.id, blocked.userId)).limit(1);
      assert.equal(row?.role, "corretor");
      assert.ok(row?.organizationId);
      assert.equal(row?.planSlug, "pro");
      assert.equal(row?.planStatus, "active");
      assert.equal(normalizePlanSlug(row?.planSlug), "pro");
    }, failures);

    await check("usuário bloqueado isBlocked é detectado", async () => {
      const [row] = await db
        .select({ isBlocked: user.isBlocked })
        .from(user)
        .where(eq(user.id, blocked.userId))
        .limit(1);
      assert.equal(row?.isBlocked, true);
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
