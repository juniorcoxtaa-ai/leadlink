import assert from "node:assert/strict";
import { DEFAULT_QUIZ_BLOCKS } from "../src/lib/quiz-blocks";
import { buildMeuLinkSaveData } from "../src/server-fns/meu-link";
import {
  getLeadVisibilityForUser,
  getPlanCapabilities,
  normalizePlanSlug,
} from "../src/lib/plans";

type Case = { name: string; run: () => void };

const cases: Case[] = [
  {
    name: "Free real salva Meu Link básico",
    run: () => {
      const result = buildMeuLinkSaveData({
        sessionUserId: "real-user-1",
        sessionPlanSlug: "free",
        sessionSlug: "sandrateste",
        incoming: {
          slug: "sandrateste",
          name: "Sandra",
          subtitle: "Corretora",
          bio: "Bio básica",
          city: "São Paulo",
          whatsapp: "11999990000",
          ctaText: "Falar comigo agora",
          links: [{ id: "1", label: "Instagram", url: "https://instagram.com/sandra", enabled: true }],
        },
      });

      assert.equal(result.userId, "real-user-1");
      assert.equal(result.slug, "sandrateste");
      assert.equal(result.config.name, "Sandra");
      assert.equal(result.config.bio, "Bio básica");
      assert.equal(result.config.whatsapp, "11999990000");
    },
  },
  {
    name: "Payload não consegue trocar userId",
    run: () => {
      const result = buildMeuLinkSaveData({
        sessionUserId: "real-user-2",
        sessionPlanSlug: "free",
        sessionSlug: "meu-link-real",
        incoming: {
          slug: "meu-link-real",
          userId: "demo-user-vista-mar-prime",
          name: "Teste",
        } as any,
      });

      assert.equal(result.userId, "real-user-2");
      assert.equal((result.config as any).userId, undefined);
    },
  },
  {
    name: "Free remove premium",
    run: () => {
      const result = buildMeuLinkSaveData({
        sessionUserId: "real-user-3",
        sessionPlanSlug: "free",
        sessionSlug: "free-link",
        incoming: {
          slug: "free-link",
          bgImage: "https://example.com/bg.jpg",
          videos: [{ id: "v1", title: "Vídeo", url: "https://youtu.be/abc", enabled: true }],
          quizBlocks: { foo: "bar" },
        } as any,
      });

      assert.equal(result.config.bgImage, "");
      assert.deepEqual(result.config.videos, []);
      assert.deepEqual(result.config.quizBlocks, DEFAULT_QUIZ_BLOCKS);
    },
  },
  {
    name: "Free mostra só 15 leads",
    run: () => {
      assert.equal(getLeadVisibilityForUser({ planSlug: "free" }, 14).masked, false);
      assert.equal(getLeadVisibilityForUser({ planSlug: "free" }, 15).masked, true);
      assert.equal(getLeadVisibilityForUser({ planSlug: "free" }, 99).isBlocked, true);
    },
  },
  {
    name: "Pro e Comercial IA não bloqueiam",
    run: () => {
      assert.equal(getLeadVisibilityForUser({ planSlug: "pro" }, 999).masked, false);
      assert.equal(getLeadVisibilityForUser({ planSlug: "comercial_ia" }, 999).masked, false);
    },
  },
  {
    name: "Plan slug indefinido cai em Free",
    run: () => {
      assert.equal(normalizePlanSlug(undefined), "free");
      assert.equal(normalizePlanSlug(null), "free");
      assert.equal(getPlanCapabilities(undefined).canUseBackgroundImage, false);
      assert.equal(getPlanCapabilities(null).hasAiAssistant, false);
    },
  },
  {
    name: "Comercial normaliza para Comercial IA",
    run: () => {
      assert.equal(normalizePlanSlug("comercial"), "comercial_ia");
      assert.equal(getPlanCapabilities("comercial").hasAiAssistant, true);
    },
  },
];

let failures = 0;

for (const testCase of cases) {
  try {
    testCase.run();
    console.log(`[PASS] ${testCase.name}`);
  } catch (error) {
    failures += 1;
    console.error(`[FAIL] ${testCase.name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exitCode = 1;
  console.error(`\nP0 harness falhou em ${failures} caso(s).`);
} else {
  console.log("\nP0 harness concluído com sucesso.");
}
