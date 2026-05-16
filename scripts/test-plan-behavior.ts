import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import {
  leads,
  meuLinkConfigs,
  organizations,
  plans,
  payments,
  properties,
  subscriptions,
  user,
} from "../src/db/schema";
import { DEFAULT_QUIZ_BLOCKS } from "../src/lib/quiz-blocks";
import {
  PLAN_PUBLIC_CATALOG,
  assertCanCreateProperty,
  getEffectivePlanSlug,
  getLeadVisibilityForUser,
  getPlanCapabilities,
  getUserPlan,
  normalizePlanSlug,
} from "../src/lib/plans";
import { buildMeuLinkSaveData, sanitizePublicMeuLinkConfig } from "../src/server-fns/meu-link";

type AccountSpec = {
  key: "free" | "pro" | "ia";
  email: string;
  slug: string;
  planSlug: "free" | "pro" | "comercial_ia";
  name: string;
  orgName: string;
};

type CreatedAccount = AccountSpec & {
  userId: string;
  orgId: string;
  planId: string;
  subscriptionId: string | null;
};

const PREFIX = "TEST_PLAN";
const NOW = new Date();

const ACCOUNTS: AccountSpec[] = [
  {
    key: "free",
    email: "plano-free@leadlink.test",
    slug: "plano-free-teste",
    planSlug: "free",
    name: "Plano Free Teste",
    orgName: `${PREFIX} - Free`,
  },
  {
    key: "pro",
    email: "plano-pro@leadlink.test",
    slug: "plano-pro-teste",
    planSlug: "pro",
    name: "Plano Pro Teste",
    orgName: `${PREFIX} - Pro`,
  },
  {
    key: "ia",
    email: "plano-ia@leadlink.test",
    slug: "plano-ia-teste",
    planSlug: "comercial_ia",
    name: "Plano Comercial IA Teste",
    orgName: `${PREFIX} - Comercial IA`,
  },
];

let failures = 0;
let createdAccounts: CreatedAccount[] = [];
let savedMeuLinkByKey = new Map<string, ReturnType<typeof buildMeuLinkSaveData>>();

function pass(label: string, details = "") {
  console.log(`[PASS] ${label}${details ? ` - ${details}` : ""}`);
}

function fail(label: string, details = "") {
  failures += 1;
  console.log(`[FAIL] ${label}${details ? ` - ${details}` : ""}`);
}

async function check(label: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    pass(label);
  } catch (error) {
    fail(label, error instanceof Error ? error.message : String(error));
  }
}

function randomId(prefix: string) {
  return `${PREFIX}_${prefix}_${crypto.randomUUID()}`;
}

function nowPlus(minutes: number) {
  return new Date(Date.now() + minutes * 60_000);
}

function planSeed(slug: "free" | "pro" | "comercial_ia" | "comercial") {
  if (slug === "free") {
    return {
      slug: "free",
      name: "Free",
      description: "Plano Free",
      priceMonthly: 0,
      setupFee: 0,
      maxUsers: 1,
      maxProperties: 3,
      maxLeadsPerMonth: 15,
      maxCustomForms: 0,
      hasCrm: false,
      hasAdvancedDashboard: false,
      hasCustomBranding: false,
      hasTeamManagement: false,
      hasLeadDistribution: false,
      hasPrioritySupport: false,
      showLeadlinkBranding: true,
      isActive: true,
    };
  }

  if (slug === "pro") {
    return {
      slug: "pro",
      name: "Pro",
      description: "Plano Pro",
      priceMonthly: 9700,
      setupFee: 0,
      maxUsers: 1,
      maxProperties: 50,
      maxLeadsPerMonth: 500,
      maxCustomForms: 3,
      hasCrm: true,
      hasAdvancedDashboard: false,
      hasCustomBranding: true,
      hasTeamManagement: false,
      hasLeadDistribution: false,
      hasPrioritySupport: false,
      showLeadlinkBranding: false,
      isActive: true,
    };
  }

  return {
    slug,
    name: "Comercial IA",
    description: "Plano Comercial IA",
    priceMonthly: 49700,
    setupFee: 0,
    maxUsers: 15,
    maxProperties: 500,
    maxLeadsPerMonth: 5000,
    maxCustomForms: 20,
    hasCrm: true,
    hasAdvancedDashboard: true,
    hasCustomBranding: true,
    hasTeamManagement: true,
    hasLeadDistribution: true,
    hasPrioritySupport: true,
    showLeadlinkBranding: false,
    isActive: true,
  };
}

async function upsertPlans() {
  for (const slug of ["free", "pro", "comercial_ia", "comercial"] as const) {
    const seed = planSeed(slug);
    await db
      .insert(plans)
      .values(seed as any)
      .onConflictDoUpdate({
        target: plans.slug,
        set: {
          ...seed,
          updatedAt: new Date(),
        } as any,
      });
  }
}

async function cleanup() {
  const emails = ACCOUNTS.map((a) => a.email);
  const orgNames = ACCOUNTS.map((a) => a.orgName);
  const rows = await db.select({ id: user.id, organizationId: user.organizationId }).from(user).where(inArray(user.email, emails));
  const userIds = rows.map((row) => row.id);
  const orgIds = Array.from(new Set(rows.map((row) => row.organizationId).filter(Boolean) as string[]));
  const orgRows = await db.select({ id: organizations.id }).from(organizations).where(inArray(organizations.name, orgNames));
  for (const row of orgRows) {
    if (!orgIds.includes(row.id)) orgIds.push(row.id);
  }

  if (userIds.length) {
    await db.delete(leads).where(inArray(leads.brokerId, userIds));
    await db.delete(properties).where(inArray(properties.brokerId, userIds));
    await db.delete(meuLinkConfigs).where(inArray(meuLinkConfigs.userId, userIds));
  }

  if (userIds.length) {
    await db.delete(user).where(inArray(user.id, userIds));
  }

  if (orgIds.length) {
    await db.delete(payments).where(inArray(payments.organizationId, orgIds));
    await db.delete(subscriptions).where(inArray(subscriptions.organizationId, orgIds));
    await db.delete(organizations).where(inArray(organizations.id, orgIds));
  }
}

async function createAccount(spec: AccountSpec): Promise<CreatedAccount> {
  const userId = randomId(spec.key);
  const [planRow] = await db.select().from(plans).where(eq(plans.slug, spec.planSlug)).limit(1);
  assert(planRow, `Plano ${spec.planSlug} precisa existir`);

  const isFree = spec.planSlug === "free";
  const subscriptionStatus = isFree ? "free" : "active";
  const fakeCustomerId = isFree ? null : `cus_${userId}`;
  const fakeSubscriptionId = isFree ? null : `sub_${userId}`;
  const [org] = await db
    .insert(organizations)
    .values({
      name: spec.orgName,
      planId: planRow.id,
      stripeCustomerId: fakeCustomerId,
      subscriptionStatus,
      trialEndsAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    })
    .returning();

  await db.insert(user).values({
    id: userId,
    name: spec.name,
    email: spec.email,
    emailVerified: true,
    role: "corretor",
    initials: spec.name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join(""),
    organizationId: org.id,
    slug: spec.slug,
    publicName: spec.name,
    whatsapp: "11999990000",
    mainCity: "São Paulo",
    regionOfOperation: "São Paulo",
    atuacao: "todos",
    instagram: `https://instagram.com/${spec.slug}`,
    brokerageName: `${PREFIX} Imobiliaria ${spec.key}`,
    especialidades: ["Teste", PREFIX],
    displayName: spec.name,
    bio: `${PREFIX} ${spec.key}`,
    creci: `TEST-${spec.key.toUpperCase()}`,
    avatarUrl: "",
    coverImageUrl: "",
    city: "São Paulo",
    state: "SP",
    whatsappNumber: "11999990000",
    instagramUrl: `https://instagram.com/${spec.slug}`,
    websiteUrl: "",
    planSlug: spec.planSlug,
    planStatus: subscriptionStatus,
    planAcquiredAt: isFree ? null : NOW,
    planExpiresAt: null,
    stripeCustomerId: fakeCustomerId,
    stripeSubscriptionId: fakeSubscriptionId,
    profileCompleted: true,
    profileCompleteness: 100,
    onboardingCompleted: true,
    createdAt: NOW,
    updatedAt: NOW,
  });

  let subscriptionId: string | null = null;
  if (!isFree) {
    const [sub] = await db
      .insert(subscriptions)
      .values({
        organizationId: org.id,
        planId: planRow.id,
        stripeCustomerId: fakeCustomerId,
        stripeSubscriptionId: fakeSubscriptionId,
        stripePriceId: `price_${spec.planSlug}`,
        status: "active",
        currentPeriodStart: NOW,
        currentPeriodEnd: nowPlus(30 * 24 * 60),
        cancelAtPeriodEnd: false,
        createdAt: NOW,
        updatedAt: NOW,
      })
      .returning();
    subscriptionId = sub.id;
  }

  return {
    ...spec,
    userId,
    orgId: org.id,
    planId: planRow.id,
    subscriptionId,
  };
}

async function createLeads(account: CreatedAccount, total = 20) {
  const existing = await db.select().from(leads).where(eq(leads.brokerId, account.userId));
  if (existing.length >= total) return;

  const rows = Array.from({ length: total }, (_, index) => ({
    id: randomId(`lead_${account.key}_${index + 1}`),
    name: `${PREFIX} ${account.key} Lead ${index + 1}`,
    phone: `11999${String(index + 1).padStart(5, "0")}`,
    email: `${PREFIX.toLowerCase()}-${account.key}-${index + 1}@example.test`,
    intentType: index % 3 === 0 ? "compra" : index % 3 === 1 ? "locacao" : "investimento",
    quizAnswers: {
      goal: index % 3 === 0 ? "Comprar" : index % 3 === 1 ? "Alugar" : "Investir",
      budget: `Faixa ${index + 1}`,
    },
    source: "Site",
    status: "novo",
    score: 50 + (index % 10),
    classification: index % 3 === 0 ? "quente" : index % 3 === 1 ? "morno" : "frio",
    urgency: "exploratorio",
    budgetRange: "indefinido",
    scoreDetail: { criteria: [{ label: "teste", points: 10 }] },
    nextStep: `Próximo passo ${index + 1}`,
    profileSummary: `Resumo ${index + 1}`,
    interest: `Interesse ${index + 1}`,
    budget: `R$ ${(index + 1) * 100000}`,
    region: "Centro",
    timeline: "30 dias",
    brokerId: account.userId,
    notes: `Notas sensíveis ${index + 1}`,
    createdAt: new Date(Date.now() - index * 60000),
    lastContact: new Date(Date.now() - index * 30000),
  }));

  await db.insert(leads).values(rows as any);
}

async function createProperties(account: CreatedAccount) {
  const existing = await db.select().from(properties).where(eq(properties.brokerId, account.userId));
  if (existing.length >= 4) return;

  const rows = Array.from({ length: account.planSlug === "free" ? 3 : 4 }, (_, index) => ({
    id: randomId(`property_${account.key}_${index + 1}`),
    code: `TEST_PLAN-${account.key}-${index + 1}`,
    title: `${PREFIX} ${account.key} Imóvel ${index + 1}`,
    type: "Apartamento",
    businessType: "Venda",
    cep: "01001000",
    street: `Rua ${index + 1}`,
    number: String(100 + index),
    complement: "",
    state: "SP",
    status: "Disponível",
    price: 1000000 + index * 100000,
    condoValue: 500,
    iptuValue: 100,
    area: 70 + index,
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    neighborhood: "Centro",
    city: "São Paulo",
    brokerId: account.userId,
    image: "",
    images: [],
    highlight: "",
    description: `Descrição ${index + 1}`,
    features: { piscina: index % 2 === 0 },
    views: 0,
    leadsCount: 0,
    createdAt: new Date(Date.now() - index * 60000),
  }));

  if (account.planSlug === "free") {
    await db.insert(properties).values(rows as any);
    return;
  }

  await db.insert(properties).values(rows as any);
}

async function saveMeuLink(account: CreatedAccount) {
  const payload = {
    slug: account.slug,
    name: `${account.name} Público`,
    subtitle: `${PREFIX} subtitle`,
    bio: `${PREFIX} bio`,
    city: "São Paulo",
    whatsapp: "11999990000",
    verified: true,
    ctaText: "Falar comigo agora",
    photoUrl: "",
    accent: "emerald",
    bgStyle: "image",
    bgImage: "https://example.com/bg.jpg",
    font: "editorial",
    btnShape: "pill",
    glass: true,
    stats: [{ id: "1", label: "Atendimentos", value: "100+" }],
    links: [{ id: "1", label: "Instagram", url: "https://instagram.com/teste", enabled: true }],
    videos: [{ id: "v1", title: "Vídeo 1", url: "https://youtu.be/abc123", enabled: true }],
    quizBlocks: {
      locacao: DEFAULT_QUIZ_BLOCKS.locacao,
      compra: DEFAULT_QUIZ_BLOCKS.compra,
      investimento: DEFAULT_QUIZ_BLOCKS.investimento,
    },
    quizIntro: "Intro",
    featuredIds: [],
    userId: "demo-user-vista-mar-prime",
  } as any;

  const normalized = buildMeuLinkSaveData({
    sessionUserId: account.userId,
    sessionPlanSlug: account.planSlug,
    sessionSlug: account.slug,
    existingRow: null,
    incoming: payload,
  });

  await db
    .insert(meuLinkConfigs)
    .values({
      slug: normalized.slug,
      userId: normalized.userId,
      data: normalized.config,
      createdAt: NOW,
      updatedAt: NOW,
    })
    .onConflictDoUpdate({
      target: meuLinkConfigs.slug,
      where: eq(meuLinkConfigs.userId, normalized.userId),
      set: {
        userId: normalized.userId,
        data: normalized.config,
        updatedAt: NOW,
      },
    });

  savedMeuLinkByKey.set(account.key, normalized);
  return normalized;
}

function testCapabilities(account: CreatedAccount) {
  const plan = getUserPlan({
    planSlug: account.planSlug,
    planStatus: account.planSlug === "free" ? "free" : "active",
    organizationPlanSlug: account.planSlug,
    organizationSubscriptionStatus: account.planSlug === "free" ? "free" : "active",
    planAcquiredAt: account.planSlug === "free" ? null : NOW,
    planExpiresAt: null,
  } as any);
  const effective = getEffectivePlanSlug({
    planSlug: account.planSlug,
    organizationPlanSlug: account.planSlug,
  });
  const caps = getPlanCapabilities(effective);

  if (account.planSlug === "free") {
    assert.equal(plan.planSlug, "free");
    assert.equal(caps.leadsLimit, 15);
    assert.equal(caps.propertiesLimit, 3);
    assert.equal(caps.canEditQuiz, false);
    assert.equal(caps.canUseBackgroundImage, false);
    assert.equal(caps.canUseVideos, false);
    assert.equal(caps.canUseExtension, false);
    assert.equal(caps.hasAiAssistant, false);
    return;
  }

  if (account.planSlug === "pro") {
    assert.equal(plan.planSlug, "pro");
    assert.equal(caps.leadsLimit, 500);
    assert.equal(caps.propertiesLimit, 50);
    assert.equal(caps.canEditQuiz, true);
    assert.equal(caps.canUseBackgroundImage, true);
    assert.equal(caps.canUseVideos, true);
    assert.equal(caps.canUseExtension, true);
    assert.equal(caps.hasAiAssistant, false);
    return;
  }

  assert.equal(plan.planSlug, "comercial_ia");
  assert.equal(caps.leadsLimit, 5000);
  assert.equal(caps.propertiesLimit, 500);
  assert.equal(caps.canEditQuiz, true);
  assert.equal(caps.canUseBackgroundImage, true);
  assert.equal(caps.canUseVideos, true);
  assert.equal(caps.canUseExtension, true);
  assert.equal(caps.hasAiAssistant, true);
}

function sanitizeBlockedLead(lead: any) {
  return {
    ...lead,
    name: "Lead mascarado",
    phone: "",
    email: "",
    region: null,
    quizAnswers: null,
    nextStep: null,
    profileSummary: null,
    interest: null,
    budget: null,
    timeline: null,
    notes: null,
    isBlocked: true,
  };
}

async function main() {
  await cleanup();
  await upsertPlans();
  createdAccounts = [];
  for (const spec of ACCOUNTS) {
    createdAccounts.push(await createAccount(spec));
  }

  for (const account of createdAccounts) {
    await createLeads(account, 20);
    await createProperties(account);
    await saveMeuLink(account);
  }

  await check("User/org/subscription coherence", async () => {
    for (const account of createdAccounts) {
      const [u] = await db.select().from(user).where(eq(user.id, account.userId)).limit(1);
      const [org] = await db.select().from(organizations).where(eq(organizations.id, account.orgId)).limit(1);
      const [planRow] = org?.planId
        ? await db.select({ slug: plans.slug }).from(plans).where(eq(plans.id, org.planId)).limit(1)
        : [];
      const [sub] = account.subscriptionId
        ? await db.select().from(subscriptions).where(eq(subscriptions.id, account.subscriptionId)).limit(1)
        : [];

      assert.equal(normalizePlanSlug(u?.planSlug), account.planSlug);
      assert.equal(normalizePlanSlug(planRow?.slug ?? null), account.planSlug);
      assert.equal(normalizePlanSlug(u?.planSlug), normalizePlanSlug(planRow?.slug ?? null));
      if (account.planSlug === "free") {
        assert.equal(sub, undefined);
      } else {
        assert.equal(sub?.planId, account.planId);
        assert.equal(sub?.status, "active");
      }
    }
  });

  await check("Free capabilities", () => {
    testCapabilities(createdAccounts[0]);
  });

  await check("Pro capabilities", () => {
    testCapabilities(createdAccounts[1]);
  });

  await check("Comercial IA capabilities", () => {
    testCapabilities(createdAccounts[2]);
  });

  await check("Free leads limit", () => {
    const account = createdAccounts[0];
    for (let index = 0; index < 20; index += 1) {
      const visibility = getLeadVisibilityForUser({ planSlug: account.planSlug }, index);
      if (index < 15) assert.equal(visibility.masked, false);
      else assert.equal(visibility.masked, true);
    }
  });

  await check("Pro leads no limit", () => {
    for (let index = 0; index < 20; index += 1) {
      assert.equal(getLeadVisibilityForUser({ planSlug: "pro" }, index).masked, false);
    }
  });

  await check("Comercial IA leads no limit", () => {
    for (let index = 0; index < 20; index += 1) {
      assert.equal(getLeadVisibilityForUser({ planSlug: "comercial_ia" }, index).masked, false);
    }
  });

  await check("Free properties limit", () => {
    assert.doesNotThrow(() => assertCanCreateProperty({ planSlug: "free" }, 2));
    assert.throws(() => assertCanCreateProperty({ planSlug: "free" }, 3));
  });

  await check("Pro properties no limit", () => {
    assert.doesNotThrow(() => assertCanCreateProperty({ planSlug: "pro" }, 3));
  });

  await check("Comercial IA properties no limit", () => {
    assert.doesNotThrow(() => assertCanCreateProperty({ planSlug: "comercial_ia" }, 4));
  });

  await check("Meu Link Free sanitization", async () => {
    const account = createdAccounts[0];
    const [row] = await db.select().from(meuLinkConfigs).where(eq(meuLinkConfigs.userId, account.userId)).limit(1);
    assert.equal(row?.userId, account.userId);
    assert.equal(row?.slug, account.slug);
    assert.equal((row?.data as any)?.bgImage ?? "", "");
    assert.deepEqual((row?.data as any)?.videos ?? [], []);
    assert.deepEqual((row?.data as any)?.quizBlocks, DEFAULT_QUIZ_BLOCKS);
    const publicData = sanitizePublicMeuLinkConfig(row?.data, account.planSlug);
    assert.equal((publicData as any)?.bgImage ?? "", "");
    assert.deepEqual((publicData as any)?.videos ?? [], []);
    assert.deepEqual((publicData as any)?.quizBlocks, DEFAULT_QUIZ_BLOCKS);
  });

  await check("Meu Link Pro premium", async () => {
    const account = createdAccounts[1];
    const [row] = await db.select().from(meuLinkConfigs).where(eq(meuLinkConfigs.userId, account.userId)).limit(1);
    assert.equal(row?.userId, account.userId);
    assert.equal((row?.data as any)?.bgImage, "https://example.com/bg.jpg");
    assert.equal((row?.data as any)?.videos?.length, 1);
    const publicData = sanitizePublicMeuLinkConfig(row?.data, account.planSlug);
    assert.equal((publicData as any)?.bgImage, "https://example.com/bg.jpg");
    assert.equal((publicData as any)?.videos?.length, 1);
  });

  await check("Meu Link Comercial IA premium", async () => {
    const account = createdAccounts[2];
    const [row] = await db.select().from(meuLinkConfigs).where(eq(meuLinkConfigs.userId, account.userId)).limit(1);
    assert.equal(row?.userId, account.userId);
    assert.equal((row?.data as any)?.bgImage, "https://example.com/bg.jpg");
    assert.equal((row?.data as any)?.videos?.length, 1);
    const publicData = sanitizePublicMeuLinkConfig(row?.data, account.planSlug);
    assert.equal((publicData as any)?.bgImage, "https://example.com/bg.jpg");
    assert.equal((publicData as any)?.videos?.length, 1);
  });

  await check("Extension capability", () => {
    assert.equal(getPlanCapabilities("free").canUseExtension, false);
    assert.equal(getPlanCapabilities("pro").canUseExtension, true);
    assert.equal(getPlanCapabilities("comercial_ia").canUseExtension, true);
    assert.equal(getPlanCapabilities("comercial_ia").hasAiAssistant, true);
  });

  await check("Planos 3 cards/config", async () => {
    const plansPublic = await db
      .select()
      .from(plans)
      .where(inArray(plans.slug, ["free", "pro", "comercial_ia"]))
      .orderBy(plans.priceMonthly);
    const slugs = plansPublic.map((p: any) => p.slug);
    assert.equal(slugs.includes("free"), true);
    assert.equal(slugs.includes("pro"), true);
    assert.equal(slugs.includes("comercial_ia"), true);
    assert.equal(new Set(slugs.filter((slug) => ["free", "pro", "comercial_ia"].includes(slug))).size, 3);
    const comercialIa = plansPublic.find((p: any) => p.slug === "comercial_ia");
    assert.equal(comercialIa?.priceMonthly, 49700);
    assert.equal(PLAN_PUBLIC_CATALOG.length, 3);
  });

  await check("Isolation by account/slug", async () => {
    for (const account of createdAccounts) {
      const [config] = await db
        .select({ userId: meuLinkConfigs.userId })
        .from(meuLinkConfigs)
        .where(eq(meuLinkConfigs.slug, account.slug))
        .limit(1);
      const props = config?.userId
        ? await db.select().from(properties).where(eq(properties.brokerId, config.userId))
        : [];
      assert.equal(props.length, account.planSlug === "free" ? 3 : 4);
      assert.ok(props.every((prop: any) => String(prop.title).includes(`${PREFIX} ${account.key}`)));
      const visibleLeadCount = await db
        .select()
        .from(leads)
        .where(eq(leads.brokerId, account.userId));
      assert.equal(visibleLeadCount.length, 20);
    }
  });

  await check("Plan divergence resolves to organization", () => {
    const plan = getUserPlan({
      planSlug: "free",
      organizationPlanSlug: "pro",
      organizationSubscriptionStatus: "active",
      planStatus: "free",
      planAcquiredAt: null,
      planExpiresAt: null,
    } as any);
    assert.equal(plan.planSlug, "pro");
    assert.equal(getEffectivePlanSlug({ planSlug: "free", organizationPlanSlug: "pro" }), "pro");
    assert.equal(normalizePlanSlug(undefined), "free");
  });

  if (failures > 0) {
    process.exitCode = 1;
    console.error(`\nTEST_PLAN falhou em ${failures} caso(s).`);
  } else {
    console.log("\nTEST_PLAN concluído com sucesso.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
