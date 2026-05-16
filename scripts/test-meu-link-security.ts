import "dotenv/config";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { meuLinkConfigs } from "../src/db/schema";
import { DEFAULT_QUIZ_BLOCKS } from "../src/lib/quiz-blocks";
import { assertMeuLinkSlugAvailable, buildMeuLinkSaveData } from "../src/server-fns/meu-link";
import { check, cleanupPrefix, createAccount, createMeuLink } from "./test-critical-utils";

const PREFIX = "TEST_MEU_LINK_SECURITY";
const failures = { count: 0 };

function payload(slug: string) {
  return {
    slug,
    userId: "demo-user-vista-mar-prime",
    name: "Teste",
    bgStyle: "image",
    bgImage: "https://example.com/bg.jpg",
    videos: [{ id: "v1", title: "Video", url: "https://youtu.be/test", enabled: true }],
    quizBlocks: { custom: true },
  } as any;
}

async function saveNormalized(normalized: ReturnType<typeof buildMeuLinkSaveData>) {
  await db.insert(meuLinkConfigs).values({
    slug: normalized.slug,
    userId: normalized.userId,
    data: normalized.config,
    updatedAt: new Date(),
  });
}

async function main() {
  await cleanupPrefix(PREFIX);
  try {
    const free = await createAccount(PREFIX, "FREE", "free");
    const pro = await createAccount(PREFIX, "PRO", "pro");
    const ia = await createAccount(PREFIX, "IA", "comercial_ia");
    const other = await createAccount(PREFIX, "OTHER", "free");
    await createMeuLink(other, { slug: "teste", name: "Owner" });
    await db.update(meuLinkConfigs).set({ slug: "teste" }).where(eq(meuLinkConfigs.userId, other.userId));

    await check("saveMeuLinkConfig nunca aceita userId do client", () => {
      const normalized = buildMeuLinkSaveData({
        sessionUserId: free.userId,
        sessionPlanSlug: "free",
        sessionSlug: free.slug,
        incoming: payload(free.slug),
      });
      assert.equal(normalized.userId, free.userId);
      assert.equal((normalized.config as any).userId, undefined);
    }, failures);

    await check("payload com userId demo é ignorado", () => {
      const normalized = buildMeuLinkSaveData({
        sessionUserId: pro.userId,
        sessionPlanSlug: "pro",
        sessionSlug: pro.slug,
        incoming: payload(pro.slug),
      });
      assert.equal(normalized.userId, pro.userId);
      assert.notEqual(normalized.userId, "demo-user-vista-mar-prime");
    }, failures);

    await check("slug duplicado de outro usuário falha e não sobrescreve config de A", async () => {
      const normalized = buildMeuLinkSaveData({
        sessionUserId: free.userId,
        sessionPlanSlug: "free",
        sessionSlug: free.slug,
        incoming: payload("teste"),
      });
      await assert.rejects(
        () => assertMeuLinkSlugAvailable(normalized.slug, free.userId),
        /Slug pertence a outro usuário/,
      );
      const [owner] = await db.select().from(meuLinkConfigs).where(eq(meuLinkConfigs.slug, "teste")).limit(1);
      assert.equal(owner?.userId, other.userId);
      assert.equal((owner?.data as any)?.name, "Owner");
    }, failures);

    await check("Free salva básico e remove premium", () => {
      const normalized = buildMeuLinkSaveData({
        sessionUserId: free.userId,
        sessionPlanSlug: "free",
        sessionSlug: free.slug,
        incoming: payload(free.slug),
      });
      assert.equal(normalized.config.bgImage, "");
      assert.deepEqual(normalized.config.videos, []);
      assert.deepEqual(normalized.config.quizBlocks, DEFAULT_QUIZ_BLOCKS);
    }, failures);

    await check("Pro salva bgImage/videos/quizBlocks", () => {
      const normalized = buildMeuLinkSaveData({
        sessionUserId: pro.userId,
        sessionPlanSlug: "pro",
        sessionSlug: pro.slug,
        incoming: payload(pro.slug),
      });
      assert.equal(normalized.config.bgImage, "https://example.com/bg.jpg");
      assert.equal(normalized.config.videos.length, 1);
      assert.deepEqual(normalized.config.quizBlocks, { custom: true });
    }, failures);

    await check("Comercial IA salva bgImage/videos/quizBlocks", () => {
      const normalized = buildMeuLinkSaveData({
        sessionUserId: ia.userId,
        sessionPlanSlug: "comercial_ia",
        sessionSlug: ia.slug,
        incoming: payload(ia.slug),
      });
      assert.equal(normalized.config.bgImage, "https://example.com/bg.jpg");
      assert.equal(normalized.config.videos.length, 1);
      assert.deepEqual(normalized.config.quizBlocks, { custom: true });
    }, failures);

    await check("userId salvo no DB é sempre session.user.id", async () => {
      const normalized = buildMeuLinkSaveData({
        sessionUserId: pro.userId,
        sessionPlanSlug: "pro",
        sessionSlug: pro.slug,
        incoming: payload(pro.slug),
      });
      await saveNormalized(normalized);
      const [row] = await db.select().from(meuLinkConfigs).where(eq(meuLinkConfigs.slug, pro.slug)).limit(1);
      assert.equal(row?.userId, pro.userId);
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
