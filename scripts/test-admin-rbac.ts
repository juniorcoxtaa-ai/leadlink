import "dotenv/config";
import assert from "node:assert/strict";
import { count, eq } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema";
import { check, cleanupPrefix, createAccount } from "./test-critical-utils";

const PREFIX = "TEST_ADMIN_RBAC";
const failures = { count: 0 };

function requireAdmin(row: { role: string } | undefined) {
  if (!row) throw new Error("Não autenticado");
  if (row.role !== "admin") throw new Error("Sem permissão");
}

async function getAdminUsersPure(sessionUserId: string, input: { plan?: string; pageSize?: number }) {
  const [sessionUser] = await db.select({ role: user.role }).from(user).where(eq(user.id, sessionUserId)).limit(1);
  requireAdmin(sessionUser);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 50));
  const where = input.plan && input.plan !== "all" ? eq(user.planSlug, input.plan) : undefined;
  const [total] = await db.select({ count: count() }).from(user).where(where);
  const items = await db
    .select({ id: user.id, planSlug: user.planSlug, role: user.role })
    .from(user)
    .where(where)
    .limit(pageSize);
  return { items, total: total?.count ?? 0, pageSize };
}

async function main() {
  await cleanupPrefix(PREFIX);
  try {
    const common = await createAccount(PREFIX, "COMMON", "free");
    const admin = await createAccount(PREFIX, "ADMIN", "pro", { role: "admin" });
    await createAccount(PREFIX, "PRO_A", "pro");
    await createAccount(PREFIX, "PRO_B", "pro");
    await createAccount(PREFIX, "IA_A", "comercial_ia");

    await check("usuário comum não acessa funções admin", async () => {
      await assert.rejects(() => getAdminUsersPure(common.userId, {}), /Sem permissão/);
    }, failures);

    await check("admin acessa funções admin", async () => {
      const result = await getAdminUsersPure(admin.userId, {});
      assert.ok(result.total >= 5);
    }, failures);

    await check("getAdminUsers com filtro plano retorna só o plano filtrado", async () => {
      const result = await getAdminUsersPure(admin.userId, { plan: "pro" });
      assert.ok(result.items.length >= 2);
      assert.ok(result.items.every((row) => row.planSlug === "pro"));
    }, failures);

    await check("paginação limita a 50", async () => {
      const result = await getAdminUsersPure(admin.userId, { pageSize: 999 });
      assert.equal(result.pageSize, 50);
      assert.ok(result.items.length <= 50);
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

