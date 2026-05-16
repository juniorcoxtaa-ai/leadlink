import "dotenv/config";
import { auth } from "../src/lib/auth";
import { db } from "../src/db";
import { organizations, user, meuLinkConfigs, properties, leads } from "../src/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { DEFAULT_QUIZ_BLOCKS, type QuizIntent } from "../src/lib/quiz-blocks";
import { sanitizeCustomLinks } from "../src/lib/meu-link-store";
import { scoreLeadAnswers } from "../src/lib/lead-scorer";
import { buildWhatsappMessage } from "../src/lib/whatsapp-message";
import crypto from "node:crypto";

type TestAccount = {
  label: "A" | "B";
  email: string;
  password: string;
  name: string;
  slug: string;
  publicName: string;
  whatsapp: string;
  mainCity: string;
  creci: string;
  atuacao: string;
  organizationName: string;
  propertyTitle: string;
  propertyCity: string;
  propertyPrice: number;
  propertyNeighborhood: string;
};

type PublicLeadInput = {
  name: string;
  city: string;
  phone: string;
  intentType: QuizIntent;
  originSlug: string;
  quizAnswers: Record<string, string>;
};

const PREFIX = "TEST_ISOLATION";
const HOST_HEADERS = new Headers({
  host: "localhost:3000",
  origin: "http://localhost:3000",
});

const ACCOUNTS: TestAccount[] = [
  {
    label: "A",
    email: "corretor-a@leadlink.test",
    password: "Leadlink@12345",
    name: "Corretor A Teste",
    slug: "corretor-a-teste",
    publicName: "Corretor A Teste",
    whatsapp: "11999999999",
    mainCity: "Itapema",
    creci: "SC-00001",
    atuacao: "todos",
    organizationName: `${PREFIX} Conta A`,
    propertyTitle: "Apartamento Teste A",
    propertyCity: "Itapema",
    propertyPrice: 900000,
    propertyNeighborhood: "Meia Praia",
  },
  {
    label: "B",
    email: "corretor-b@leadlink.test",
    password: "Leadlink@12345",
    name: "Corretor B Teste",
    slug: "corretor-b-teste",
    publicName: "Corretor B Teste",
    whatsapp: "11988888888",
    mainCity: "Balneario Camboriu",
    creci: "SC-00002",
    atuacao: "todos",
    organizationName: `${PREFIX} Conta B`,
    propertyTitle: "Apartamento Teste B",
    propertyCity: "Balneario Camboriu",
    propertyPrice: 1200000,
    propertyNeighborhood: "Centro",
  },
];

let failures = 0;

function pass(label: string, details = "") {
  console.log(`[PASS] ${label}${details ? ` - ${details}` : ""}`);
}

function fail(label: string, details = "") {
  failures += 1;
  console.log(`[FAIL] ${label}${details ? ` - ${details}` : ""}`);
}

function assert(condition: unknown, label: string, details = "") {
  if (condition) pass(label, details);
  else fail(label, details);
}

async function ensureAccount(account: TestAccount) {
  const existing = await db.select().from(user).where(eq(user.email, account.email)).limit(1);
  if (existing[0]) return existing[0];

  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: account.email,
        password: account.password,
        name: account.name,
      },
      headers: HOST_HEADERS,
    });
    const created = result?.user ?? result?.data?.user;
    if (created?.id) {
      return created;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[INFO] signUpEmail for ${account.email}: ${message}`);
  }

  const [row] = await db.select().from(user).where(eq(user.email, account.email)).limit(1);
  if (!row) throw new Error(`Nao foi possivel localizar a conta ${account.email}`);
  return row;
}

async function cleanupPreviousTestData() {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(inArray(user.email, [ACCOUNTS[0].email, ACCOUNTS[1].email]));
  const userIds = rows.map((row) => row.id).filter(Boolean);
  if (!userIds.length) return;

  await db
    .delete(leads)
    .where(
      and(inArray(leads.brokerId, userIds), inArray(leads.name, ["Lead A Teste", "Lead B Teste"])),
    );
  await db
    .delete(properties)
    .where(
      and(
        inArray(properties.brokerId, userIds),
        inArray(properties.title, [ACCOUNTS[0].propertyTitle, ACCOUNTS[1].propertyTitle]),
      ),
    );
  await db
    .delete(meuLinkConfigs)
    .where(inArray(meuLinkConfigs.slug, [ACCOUNTS[0].slug, ACCOUNTS[1].slug]));
}

async function upsertOrganization(name: string) {
  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(organizations).values({ name }).returning();
  return created;
}

async function configureProfile(account: TestAccount, userId: string, organizationId: string) {
  await db
    .update(user)
    .set({
      organizationId,
      publicName: account.publicName,
      whatsapp: account.whatsapp,
      mainCity: account.mainCity,
      regionOfOperation: account.mainCity,
      creci: account.creci,
      atuacao: account.atuacao,
      instagram: `https://instagram.com/teste-${account.label.toLowerCase()}`,
      avatarUrl: "",
      brokerageName: `${PREFIX} Imobiliaria ${account.label}`,
      bio: `Perfil de teste ${account.label}`,
      especialidades: ["Teste", "Lead Link", account.mainCity],
      slug: account.slug,
      profileCompleted: true,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  const [existingConfig] = await db
    .select()
    .from(meuLinkConfigs)
    .where(eq(meuLinkConfigs.userId, userId))
    .limit(1);

  const configData = {
    name: account.publicName,
    subtitle: `${account.mainCity} - ${account.creci}`,
    bio: `Atendimento em ${account.mainCity}`,
    city: account.mainCity,
    whatsapp: account.whatsapp,
    slug: account.slug,
    verified: false,
    ctaText: "Falar comigo agora",
    photoUrl: "",
    accent: "emerald",
    bgStyle: "paper",
    bgImage: "",
    font: "editorial",
    btnShape: "pill",
    glass: true,
    stats: [],
    links: sanitizeCustomLinks(
      [
        {
          id: crypto.randomUUID(),
          label: "Instagram",
          url: `https://instagram.com/teste-${account.label.toLowerCase()}`,
          enabled: true,
        },
      ],
      account.slug,
    ),
    videos: [],
    quizBlocks: DEFAULT_QUIZ_BLOCKS,
    quizIntro: "Conte o que voce procura",
    featuredIds: [],
  };

  if (existingConfig) {
    await db
      .update(meuLinkConfigs)
      .set({
        slug: account.slug,
        userId,
        data: configData,
        updatedAt: new Date(),
      })
      .where(eq(meuLinkConfigs.userId, userId));
  } else {
    await db.insert(meuLinkConfigs).values({
      slug: account.slug,
      userId,
      data: configData,
      updatedAt: new Date(),
    });
  }
}

async function createPropertyFor(userId: string, account: TestAccount) {
  const existing = await db
    .select()
    .from(properties)
    .where(and(eq(properties.brokerId, userId), eq(properties.title, account.propertyTitle)))
    .limit(1);

  if (existing[0]) return existing[0];

  const code = `${PREFIX}-${account.label}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const [created] = await db
    .insert(properties)
    .values({
      code,
      title: account.propertyTitle,
      type: "Apartamento",
      businessType: "Venda",
      status: "Disponível",
      price: account.propertyPrice,
      area: 80,
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      neighborhood: account.propertyNeighborhood,
      city: account.propertyCity,
      brokerId: userId,
      description: `${PREFIX} property ${account.label}`,
      features: { testIsolation: true },
      image: "",
      images: [],
      highlight: "Teste",
    })
    .returning();

  return created;
}

async function createPublicLead(input: PublicLeadInput) {
  const [config] = await db
    .select({ userId: meuLinkConfigs.userId })
    .from(meuLinkConfigs)
    .where(eq(meuLinkConfigs.slug, input.originSlug))
    .limit(1);

  if (!config?.userId) {
    throw new Error(`Slug invalido: ${input.originSlug}`);
  }

  const scoring = scoreLeadAnswers({
    intentType: input.intentType,
    quizAnswers: input.quizAnswers,
    notes: JSON.stringify({ intentType: input.intentType, quizAnswers: input.quizAnswers }),
  });

  const [created] = await db
    .insert(leads)
    .values({
      name: input.name,
      phone: input.phone,
      intentType: input.intentType,
      quizAnswers: input.quizAnswers as never,
      source: "Meu Link / Quiz",
      status: "novo",
      score: scoring.score,
      classification: scoring.classification,
      urgency: scoring.urgency,
      budgetRange: scoring.budgetRange,
      scoreDetail: scoring.scoreDetail as never,
      nextStep: scoring.nextStep,
      profileSummary: scoring.profileSummary || "Lead antigo sem respostas estruturadas.",
      region: input.city,
      brokerId: config.userId,
      notes: buildNotes(input, scoring),
    })
    .returning();

  return created;
}

function buildNotes(input: PublicLeadInput, scoring: ReturnType<typeof scoreLeadAnswers>) {
  const lines = [
    `${PREFIX} lead`,
    `Nome: ${input.name}`,
    `Cidade: ${input.city}`,
    `Telefone: ${input.phone}`,
    `Interesse: ${input.intentType}`,
    `Score: ${scoring.score}`,
    `Classificacao: ${scoring.classification}`,
  ];
  return lines.join("\n");
}

async function validateAccount(account: TestAccount, userRow: typeof user.$inferSelect) {
  const leadsVisible = await db
    .select()
    .from(leads)
    .where(eq(leads.brokerId, userRow.id))
    .orderBy(asc(leads.createdAt));
  const propsVisible = await db
    .select()
    .from(properties)
    .where(eq(properties.brokerId, userRow.id))
    .orderBy(asc(properties.createdAt));

  assert(userRow.slug === account.slug, `Conta ${account.label} slug unico`, userRow.slug ?? "");
  assert(Boolean(userRow.profileCompleted), `Conta ${account.label} perfil completo`);
  assert(
    leadsVisible.length === 1,
    `Conta ${account.label} ve apenas seu lead`,
    `count=${leadsVisible.length}`,
  );
  assert(
    propsVisible.length === 1,
    `Conta ${account.label} ve apenas seu imovel`,
    `count=${propsVisible.length}`,
  );

  const otherSlug = ACCOUNTS.find((a) => a.label !== account.label)!.slug;
  const [otherConfig] = await db
    .select()
    .from(meuLinkConfigs)
    .where(eq(meuLinkConfigs.slug, otherSlug))
    .limit(1);
  const publicProps = await db
    .select()
    .from(properties)
    .where(and(eq(properties.brokerId, userRow.id), eq(properties.status, "Disponível")))
    .orderBy(asc(properties.createdAt));
  assert(
    publicProps.length === 1,
    `Vitrine publica da conta ${account.label}`,
    `count=${publicProps.length}`,
  );
  assert(
    !otherConfig || otherConfig.userId !== userRow.id,
    `Slug da conta ${account.label} nao conflita`,
  );

  const lead = leadsVisible[0];
  const qAnswers = (lead.quizAnswers as Record<string, unknown> | null) ?? {};
  const hasStructured = Object.keys(qAnswers).length > 0;
  assert(hasStructured, `Lead ${account.label} tem quizAnswers estruturado`);
  assert(
    Boolean(lead.intentType),
    `Lead ${account.label} tem intentType`,
    String(lead.intentType ?? ""),
  );
  assert(
    Boolean(lead.classification),
    `Lead ${account.label} tem classificacao`,
    String(lead.classification ?? ""),
  );
  assert(Boolean(lead.nextStep), `Lead ${account.label} tem nextStep`, String(lead.nextStep ?? ""));
  assert(
    Boolean(lead.profileSummary),
    `Lead ${account.label} tem profileSummary`,
    String(lead.profileSummary ?? ""),
  );

  const message = decodeURIComponent(
    buildWhatsappMessage({
      name: lead.name,
      city: lead.region || account.mainCity,
      phone: lead.phone,
      intentType: lead.intentType as QuizIntent,
      quizAnswers: qAnswers,
    }),
  );
  assert(
    !message.includes("q-"),
    `Mensagem WhatsApp da conta ${account.label} sem labels tecnicos`,
  );
  assert(
    !message.includes("intentType"),
    `Mensagem WhatsApp da conta ${account.label} sem JSON cru`,
  );
  assert(
    !message.includes("quizAnswers"),
    `Mensagem WhatsApp da conta ${account.label} sem JSON cru`,
  );
  assert(!message.includes("@"), `Mensagem WhatsApp da conta ${account.label} sem e-mail`);

  const scoring = scoreLeadAnswers({
    intentType: lead.intentType as QuizIntent,
    quizAnswers: qAnswers,
    notes: lead.notes ?? undefined,
  });
  assert(
    scoring.score === lead.score,
    `Lead ${account.label} score calculado`,
    `db=${lead.score} helper=${scoring.score}`,
  );
  assert(
    scoring.classification === lead.classification,
    `Lead ${account.label} classificacao calculada`,
    `db=${lead.classification} helper=${scoring.classification}`,
  );
  assert(scoring.nextStep === lead.nextStep, `Lead ${account.label} nextStep calculado`);
}

async function main() {
  console.log(`${PREFIX}: start`);
  await cleanupPreviousTestData();

  const createdUsers: Array<{ account: TestAccount; row: typeof user.$inferSelect }> = [];
  for (const account of ACCOUNTS) {
    const [orgA] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.name, account.organizationName))
      .limit(1);
    const org = orgA ?? (await upsertOrganization(account.organizationName));
    const row = await ensureAccount(account);
    await configureProfile(account, row.id, org.id);
    await createPropertyFor(row.id, account);
    const [freshRow] = await db.select().from(user).where(eq(user.id, row.id)).limit(1);
    createdUsers.push({ account, row: freshRow });
    pass(`Conta ${account.label} criada/configurada`, freshRow.email);
  }

  const leadA = await createPublicLead({
    name: "Lead A Teste",
    city: "Itapema",
    phone: "11977777777",
    intentType: "compra",
    originSlug: ACCOUNTS[0].slug,
    quizAnswers: {
      "q-buy-neighborhood": "Meia Praia",
      "q-buy-type": "Apartamento",
      "q-buy-bedrooms": "3",
      "q-buy-budget": "1 milhao",
      "q-financing": "Sim",
      "q-credit": "Nao",
      "q-buy-timeline": "1 a 3 meses",
      "q-terms": "Aceito",
    },
  });
  const leadB = await createPublicLead({
    name: "Lead B Teste",
    city: "Balneario Camboriu",
    phone: "11966666666",
    intentType: "locacao",
    originSlug: ACCOUNTS[1].slug,
    quizAnswers: {
      "q-loc-neighborhood": "Centro",
      "q-loc-type": "Apartamento",
      "q-loc-bedrooms": "2",
      "q-loc-rent": "4500",
      "q-loc-timeline": "Imediatamente",
      "q-loc-pets": "Nao",
      "q-terms": "Aceito",
    },
  });
  pass("Leads publicos criados", `${leadA.id} / ${leadB.id}`);

  const [rowA] = createdUsers.filter((item) => item.account.label === "A");
  const [rowB] = createdUsers.filter((item) => item.account.label === "B");

  await validateAccount(ACCOUNTS[0], rowA.row);
  await validateAccount(ACCOUNTS[1], rowB.row);

  const [leadARow] = await db.select().from(leads).where(eq(leads.id, leadA.id)).limit(1);
  const [leadBRow] = await db.select().from(leads).where(eq(leads.id, leadB.id)).limit(1);
  const msgA = decodeURIComponent(
    buildWhatsappMessage({
      name: leadARow.name,
      city: leadARow.region || "Itapema",
      phone: leadARow.phone,
      intentType: leadARow.intentType as QuizIntent,
      quizAnswers: (leadARow.quizAnswers as Record<string, unknown>) ?? {},
    }),
  );
  const msgB = decodeURIComponent(
    buildWhatsappMessage({
      name: leadBRow.name,
      city: leadBRow.region || "Balneario Camboriu",
      phone: leadBRow.phone,
      intentType: leadBRow.intentType as QuizIntent,
      quizAnswers: (leadBRow.quizAnswers as Record<string, unknown>) ?? {},
    }),
  );

  assert(msgA.includes("Lead A Teste"), "Mensagem A contem nome");
  assert(msgB.includes("Lead B Teste"), "Mensagem B contem nome");

  console.log(`${PREFIX}: done`);
  console.log(failures ? `${PREFIX}: FAIL (${failures})` : `${PREFIX}: PASS`);
  process.exitCode = failures ? 1 : 0;
}

main().catch((error) => {
  console.error(`${PREFIX}: fatal`, error);
  process.exitCode = 1;
});
