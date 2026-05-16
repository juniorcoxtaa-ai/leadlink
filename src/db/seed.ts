import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import * as schema from "./schema";
import { DATABASE_URL } from "../config.server";

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

const BROKER_PASSWORD = "demo1234";

const brokerData = [
  { name: "Mariana Costa", email: "mariana@imovix.com.br", initials: "MC", role: "admin" },
  { name: "Rafael Souza", email: "rafael@imovix.com.br", initials: "RS", role: "corretor" },
  { name: "Juliana Pereira", email: "juliana@imovix.com.br", initials: "JP", role: "corretor" },
  { name: "Carlos Mendes", email: "carlos@imovix.com.br", initials: "CM", role: "corretor" },
];

const propertyImages = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=900&q=80",
];

const leadNames = [
  "Ana Beatriz Almeida", "Pedro Henrique Lima", "Camila Rodrigues", "Lucas Oliveira",
  "Fernanda Martins", "Bruno Carvalho", "Patrícia Gomes", "Thiago Nascimento",
  "Renata Vieira", "Gustavo Ferreira", "Larissa Ribeiro", "Marcos Pinto",
  "Beatriz Cardoso", "Rodrigo Barros", "Isabela Moreira", "Felipe Araújo",
  "Vanessa Teixeira", "Eduardo Lopes", "Carolina Dias", "André Castro",
];

const interests = [
  "Apartamento 3 dorms - Vila Mariana",
  "Cobertura Duplex - Itaim Bibi",
  "Casa em condomínio - Alphaville",
  "Studio - Vila Madalena",
  "Apartamento 2 dorms - Pinheiros",
  "Sala Comercial - Faria Lima",
  "Apartamento 4 dorms - Jardins",
  "Casa - Granja Viana",
];

const regions = ["São Paulo - SP", "Alphaville - SP", "Santo André - SP", "Campinas - SP"];
const sources = ["Site", "ZAP", "OLX", "Viva Real", "Indicação", "Instagram"];
const statuses = ["novo", "contatado", "qualificado", "visita", "proposta", "ganho", "perdido"];
const timelines = ["Imediato", "1-3 meses", "3-6 meses", "Mais de 6 meses"];

function daysAgo(d: number): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt;
}

function inDays(d: number, h: number, m = 0): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  dt.setHours(h, m, 0, 0);
  return dt;
}

const SEED_PLANS = [
  {
    id: "plan_free",
    name: "Free",
    slug: "free",
    description: "Para teste inicial do corretor autônomo",
    priceMonthly: 0,
    setupFee: 0,
    maxUsers: 1,
    maxProperties: 5,
    maxLeadsPerMonth: 30,
    maxCustomForms: 0,
    hasCrm: false,
    hasAdvancedDashboard: false,
    hasCustomBranding: false,
    hasTeamManagement: false,
    hasLeadDistribution: false,
    hasPrioritySupport: false,
    showLeadlinkBranding: true,
    isActive: true,
  },
  {
    id: "plan_pro",
    name: "Pro",
    slug: "pro",
    description: "Para o corretor autônomo profissional",
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
  },
  {
    id: "plan_comercial",
    name: "Comercial",
    slug: "comercial",
    description: "Para imobiliárias e equipes comerciais",
    priceMonthly: 129000,
    setupFee: 490000,
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
  },
] as const;

async function seed() {
  if (process.env.NODE_ENV === "production") {
    console.error("Seed abortado: execução bloqueada em produção.");
    process.exit(1);
  }

  console.log("🌱 Iniciando seed...");

  // ─── Limpar tabelas na ordem correta ─────────────────────────
  await db.delete(schema.chatMessages);
  await db.delete(schema.activities);
  await db.delete(schema.appointments);
  await db.delete(schema.leads);
  await db.delete(schema.properties);
  await db.delete(schema.session);
  await db.delete(schema.account);
  await db.delete(schema.verification);
  await db.delete(schema.user);
  await db.delete(schema.subscriptions).catch(() => {});
  await db.delete(schema.organizations).catch(() => {});
  console.log("✓ Tabelas limpas");

  // ─── Seed dos planos ──────────────────────────────────────────
  for (const plan of SEED_PLANS) {
    await db
      .insert(schema.plans)
      .values(plan)
      .onConflictDoNothing({ target: schema.plans.slug });
  }
  console.log("✓ Planos criados (Free, Pro, Comercial)");

  // ─── Criar usuários (corretores) com organizações ────────────
  const hashedPassword = await bcrypt.hash(BROKER_PASSWORD, 10);
  const userIds: string[] = [];

  // Admin usa plano Pro como demo; outros usam Free
  const planMap = { admin: "plan_pro", corretor: "plan_free" };

  for (const broker of brokerData) {
    const userId = crypto.randomUUID();
    const orgId = crypto.randomUUID();
    const planId = planMap[broker.role as keyof typeof planMap] ?? "plan_free";

    // Cria organização pessoal do corretor
    await db.insert(schema.organizations).values({
      id: orgId,
      name: broker.name,
      planId,
      subscriptionStatus: broker.role === "admin" ? "active" : "free",
    });

    userIds.push(userId);
    await db.insert(schema.user).values({
      id: userId,
      name: broker.name,
      email: broker.email,
      emailVerified: true,
      role: broker.role,
      initials: broker.initials,
      organizationId: orgId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(schema.account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`✓ ${userIds.length} corretores criados com organizações`);

  // ─── Criar imóveis ────────────────────────────────────────────
  const propData = [
    { t: "Cobertura Duplex Vista Parque", n: "Itaim Bibi", type: "Cobertura", b: 4, ba: 5, p: 4, area: 320, price: 8900000, h: "Exclusividade", s: "Disponível" },
    { t: "Apartamento Alto Padrão", n: "Vila Nova Conceição", type: "Apartamento", b: 3, ba: 4, p: 3, area: 185, price: 4250000, h: null, s: "Disponível" },
    { t: "Casa Térrea Moderna", n: "Alphaville Residencial 6", type: "Casa", b: 4, ba: 5, p: 4, area: 420, price: 5800000, h: "Lançamento", s: "Disponível" },
    { t: "Studio Designer", n: "Vila Madalena", type: "Studio", b: 1, ba: 1, p: 1, area: 38, price: 685000, h: null, s: "Reservado" },
    { t: "Apartamento Garden", n: "Pinheiros", type: "Apartamento", b: 2, ba: 2, p: 2, area: 120, price: 1850000, h: null, s: "Em captação" },
    { t: "Cobertura Linear", n: "Jardins", type: "Cobertura", b: 4, ba: 4, p: 3, area: 280, price: 6500000, h: "Vista única", s: "Disponível" },
    { t: "Sala Comercial Premium", n: "Faria Lima", type: "Comercial", b: 0, ba: 2, p: 2, area: 95, price: 1450000, h: null, s: "Vendido" },
    { t: "Casa em Condomínio", n: "Granja Viana", type: "Casa", b: 4, ba: 4, p: 4, area: 380, price: 3200000, h: null, s: "Disponível" },
  ];

  const propertyIds: string[] = [];
  for (let i = 0; i < propData.length; i++) {
    const p = propData[i];
    const propId = crypto.randomUUID();
    propertyIds.push(propId);
    await db.insert(schema.properties).values({
      id: propId,
      code: `LL${2000 + i}`,
      title: p.t,
      type: p.type,
      status: p.s,
      price: p.price,
      area: p.area,
      bedrooms: p.b,
      bathrooms: p.ba,
      parking: p.p,
      neighborhood: p.n,
      city: "São Paulo",
      brokerId: userIds[i % userIds.length],
      image: propertyImages[i],
      highlight: p.h ?? null,
      views: 120 + ((i * 137) % 800),
      leadsCount: 4 + ((i * 7) % 22),
    });
  }
  console.log(`✓ ${propertyIds.length} imóveis criados`);

  // ─── Criar leads ──────────────────────────────────────────────
  const leadIds: string[] = [];

  for (let i = 0; i < leadNames.length; i++) {
    const name = leadNames[i];
    const leadId = crypto.randomUUID();
    leadIds.push(leadId);

    const phone = `+55 11 9${(90000 + ((i * 7919) % 9999)).toString().slice(0, 4)}-${1000 + ((i * 1237) % 9000)}`;
    const budgetVal = 350 + ((i * 137) % 2400);
    const budget = `R$ ${budgetVal.toLocaleString("pt-BR")}.000`;
    const email = name.toLowerCase().replace(/ /g, ".").normalize("NFD").replace(/[^\w.]/g, "") + "@email.com";

    await db.insert(schema.leads).values({
      id: leadId,
      name,
      phone,
      email,
      source: sources[i % sources.length],
      status: statuses[i % statuses.length],
      score: 30 + ((i * 13) % 70),
      interest: interests[i % interests.length],
      budget,
      region: regions[i % regions.length],
      timeline: timelines[i % timelines.length],
      brokerId: userIds[i % userIds.length],
      notes: "Cliente interessado em financiamento. Solicitou simulação.",
      createdAt: daysAgo(i % 30),
      lastContact: daysAgo(i % 7),
    });

    // Atividades
    await db.insert(schema.activities).values([
      { leadId, type: "criado", text: `Lead criado via ${sources[i % sources.length]}`, createdAt: daysAgo(i % 30) },
      { leadId, type: "mensagem", text: "Mensagem de boas-vindas enviada via WhatsApp", createdAt: daysAgo(Math.max(0, (i % 30) - 1)) },
      { leadId, type: "ligacao", text: "Ligação realizada - duração 4min", createdAt: daysAgo(Math.max(0, (i % 30) - 2)) },
      { leadId, type: "nota", text: "Cliente prefere contato pela manhã", createdAt: daysAgo(Math.max(0, (i % 30) - 3)) },
    ]);

    // Chat
    const firstName = name.split(" ")[0];
    await db.insert(schema.chatMessages).values([
      { leadId, from: "broker", text: `Olá ${firstName}! Vi seu interesse em ${interests[i % interests.length]}. Posso te ajudar?`, createdAt: daysAgo(3) },
      { leadId, from: "lead", text: "Oi! Sim, gostaria de mais informações sobre valores e condições.", createdAt: daysAgo(3) },
      { leadId, from: "broker", text: `Claro! O valor está em ${budget}. Aceita financiamento. Quando podemos agendar uma visita?`, createdAt: daysAgo(2) },
      { leadId, from: "lead", text: "Posso na sexta de tarde?", createdAt: daysAgo(1) },
    ]);
  }
  console.log(`✓ ${leadIds.length} leads criados`);

  // ─── Criar agendamentos ───────────────────────────────────────
  const appointmentData = [
    { title: "Visita Cobertura Duplex", type: "Visita", leadName: leadNames[0], leadIdx: 0, propIdx: 0, brokerIdx: 0, d: 0, h: 10, dur: 60, loc: "Itaim Bibi, SP", s: "confirmado" },
    { title: "Reunião proposta", type: "Reunião", leadName: leadNames[1], leadIdx: 1, propIdx: 1, brokerIdx: 0, d: 0, h: 14, dur: 45, loc: "Escritório", s: "confirmado" },
    { title: "Ligação follow-up", type: "Ligação", leadName: leadNames[2], leadIdx: 2, propIdx: -1, brokerIdx: 1, d: 0, h: 16, dur: 20, loc: "Telefone", s: "pendente" },
    { title: "Visita Casa Alphaville", type: "Visita", leadName: leadNames[3], leadIdx: 3, propIdx: 2, brokerIdx: 2, d: 1, h: 9, dur: 90, loc: "Alphaville, SP", s: "confirmado" },
    { title: "Assinatura de contrato", type: "Assinatura", leadName: leadNames[4], leadIdx: 4, propIdx: 3, brokerIdx: 0, d: 1, h: 15, dur: 60, loc: "Cartório Sé", s: "confirmado" },
    { title: "Visita Cobertura Linear", type: "Visita", leadName: leadNames[5], leadIdx: 5, propIdx: 5, brokerIdx: 1, d: 2, h: 11, dur: 60, loc: "Jardins, SP", s: "pendente" },
    { title: "Reunião alinhamento", type: "Reunião", leadName: leadNames[6], leadIdx: 6, propIdx: -1, brokerIdx: 3, d: 2, h: 17, dur: 30, loc: "Online", s: "confirmado" },
    { title: "Visita Garden", type: "Visita", leadName: leadNames[7], leadIdx: 7, propIdx: 4, brokerIdx: 2, d: 3, h: 10, dur: 45, loc: "Pinheiros, SP", s: "confirmado" },
  ];

  for (const a of appointmentData) {
    await db.insert(schema.appointments).values({
      title: a.title,
      type: a.type,
      leadName: a.leadName,
      leadId: leadIds[a.leadIdx] ?? null,
      propertyTitle: a.propIdx >= 0 ? propData[a.propIdx].t : null,
      propertyId: a.propIdx >= 0 ? propertyIds[a.propIdx] : null,
      brokerId: userIds[a.brokerIdx],
      date: inDays(a.d, a.h),
      duration: a.dur,
      location: a.loc,
      status: a.s,
    });
  }
  console.log(`✓ ${appointmentData.length} agendamentos criados`);

  console.log("\n✅ Seed concluído!");
  console.log("\n📋 Credenciais de acesso:");
  for (const b of brokerData) {
    console.log(`   ${b.email} / ${BROKER_PASSWORD}`);
  }

  await client.end();
}

seed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
