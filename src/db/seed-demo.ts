import "dotenv/config";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray, or } from "drizzle-orm";
import * as schema from "./schema";
import { DATABASE_URL } from "../config.server";

const DEMO_ENV_PASSWORD = process.env.DEMO_USER_PASSWORD;
const DEMO_ORG_ID = "demo-org-vista-mar-prime";
const DEMO_USER_ID = "demo-user-vista-mar-prime";
const DEMO_SLUG = "vista-mar-prime";
const DEMO_PASSWORD = "DEMO_USER_PASSWORD";

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

const demoPropertyImages = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
];

const propertySeeds = [
  { title: "Cobertura Duplex Frente Mar", neighborhood: "Meia Praia", type: "Cobertura", businessType: "Venda", price: 4850000, area: 248, bedrooms: 4, bathrooms: 5, parking: 3, highlight: true, status: "Disponível", description: "Cobertura duplex com vista panorâmica, terraço gourmet e acabamento premium." },
  { title: "Apartamento Alto Padrão 3 Dormitórios", neighborhood: "Meia Praia", type: "Apartamento", businessType: "Venda", price: 2350000, area: 132, bedrooms: 3, bathrooms: 3, parking: 2, highlight: true, status: "Disponível", description: "Planta funcional, suíte master e integração total da área social." },
  { title: "Lançamento Oceano Residence 4 Suítes", neighborhood: "Centro", type: "Apartamento", businessType: "Lançamento", price: 3980000, area: 176, bedrooms: 4, bathrooms: 5, parking: 3, highlight: true, status: "Disponível", description: "Lançamento com área de lazer completa e assinatura de alto padrão." },
  { title: "Locação Anual 2 Dormitórios Mobiliado", neighborhood: "Meia Praia", type: "Apartamento", businessType: "Locação Anual", price: 7800, area: 82, bedrooms: 2, bathrooms: 2, parking: 1, highlight: false, status: "Disponível", description: "Ideal para moradia anual, mobiliado e pronto para ocupação imediata." },
  { title: "Cobertura com Terraço Gourmet", neighborhood: "Centro", type: "Cobertura", businessType: "Venda", price: 5200000, area: 260, bedrooms: 4, bathrooms: 5, parking: 3, highlight: true, status: "Reservado", description: "Terraço amplo, vista aberta e living integrado para receber com elegância." },
  { title: "Apartamento 3 Suítes Vista Mar", neighborhood: "Meia Praia", type: "Apartamento", businessType: "Venda", price: 3120000, area: 145, bedrooms: 3, bathrooms: 4, parking: 2, highlight: false, status: "Disponível", description: "Vista definitiva para o mar, sacada integrada e suíte master generosa." },
  { title: "Salao Premium para Locação Anual", neighborhood: "Meia Praia", type: "Apartamento", businessType: "Locação Anual", price: 9200, area: 96, bedrooms: 3, bathrooms: 2, parking: 2, highlight: false, status: "Disponível", description: "Conforto e localização estratégica para família exigente." },
  { title: "Lançamento Praia Nobre Garden", neighborhood: "Morretes", type: "Apartamento", businessType: "Lançamento", price: 1290000, area: 108, bedrooms: 2, bathrooms: 2, parking: 1, highlight: true, status: "Disponível", description: "Projeto novo com lazer contemporâneo e excelente perspectiva de valorização." },
  { title: "Apartamento 4 Dormitórios Quadra Mar", neighborhood: "Meia Praia", type: "Apartamento", businessType: "Venda", price: 4250000, area: 188, bedrooms: 4, bathrooms: 4, parking: 3, highlight: true, status: "Vendido", description: "Amplo, sofisticado e a poucos passos da praia, com planta para família grande." },
  { title: "Cobertura Linear Exclusiva", neighborhood: "Centro", type: "Cobertura", businessType: "Venda", price: 6780000, area: 310, bedrooms: 4, bathrooms: 6, parking: 4, highlight: true, status: "Disponível", description: "Pé-direito elevado, piscina privativa e área social para alto entretenimento." },
  { title: "Apartamento 2 Dormitórios Investimento", neighborhood: "Meia Praia", type: "Apartamento", businessType: "Venda", price: 980000, area: 74, bedrooms: 2, bathrooms: 2, parking: 1, highlight: false, status: "Disponível", description: "Excelente liquidez para segunda residência ou carteira de investimento." },
  { title: "Loft de Luxo para Locação", neighborhood: "Andorinha", type: "Apartamento", businessType: "Locação Anual", price: 6400, area: 58, bedrooms: 1, bathrooms: 1, parking: 1, highlight: false, status: "Reservado", description: "Perfil compacto com acabamento sofisticado e pouca manutenção." },
  { title: "Lançamento Vista Atlântica 3 Suítes", neighborhood: "Meia Praia", type: "Apartamento", businessType: "Lançamento", price: 2790000, area: 138, bedrooms: 3, bathrooms: 4, parking: 2, highlight: true, status: "Disponível", description: "Obra em fase de lançamento com conceito resort e plantas amplas." },
  { title: "Apartamento Frente Avenida para Aluguel", neighborhood: "Meia Praia", type: "Apartamento", businessType: "Locação Anual", price: 8600, area: 104, bedrooms: 3, bathrooms: 3, parking: 2, highlight: false, status: "Alugado", description: "Boa exposição, planta versátil e ideal para família em mudança." },
  { title: "Casa Duplex em Condomínio Fechado", neighborhood: "Morretes", type: "Casa", businessType: "Venda", price: 3450000, area: 215, bedrooms: 4, bathrooms: 4, parking: 2, highlight: false, status: "Disponível", description: "Casa exclusiva com segurança, quintal e área social integrada." },
];

const leadSeeds = [
  { name: "Camila Souza", phone: "47991230001", city: "Itapema - SC", origin: "Instagram", temperature: "quente", interest: "Cobertura duplex com vista mar", propertyIndex: 0, status: "qualificado" },
  { name: "Ricardo Almeida", phone: "47991230002", city: "Balneário Camboriú - SC", origin: "Indicação", temperature: "quente", interest: "Apartamento 4 dormitórios alto padrão", propertyIndex: 8, status: "proposta" },
  { name: "Fernanda Lima", phone: "47991230003", city: "Florianópolis - SC", origin: "Site", temperature: "morno", interest: "Lançamento com boa valorização", propertyIndex: 2, status: "novo" },
  { name: "Bruno Martins", phone: "47991230004", city: "Curitiba - PR", origin: "Portal", temperature: "frio", interest: "Locação anual em Meia Praia", propertyIndex: 3, status: "contatado" },
  { name: "Patrícia Nunes", phone: "47991230005", city: "Joinville - SC", origin: "WhatsApp", temperature: "quente", interest: "Cobertura linear com terraço", propertyIndex: 9, status: "visita" },
  { name: "Daniel Rocha", phone: "47991230006", city: "Porto Alegre - RS", origin: "Instagram", temperature: "morno", interest: "Apartamento 3 suítes vista mar", propertyIndex: 5, status: "qualificado" },
  { name: "Larissa Costa", phone: "47991230007", city: "Chapecó - SC", origin: "Facebook Ads", temperature: "frio", interest: "Investimento em lançamento", propertyIndex: 7, status: "novo" },
  { name: "Gustavo Pereira", phone: "47991230008", city: "Blumenau - SC", origin: "Site", temperature: "quente", interest: "Apartamento 2 dormitórios para família", propertyIndex: 10, status: "ganho" },
  { name: "Juliana Ferreira", phone: "47991230009", city: "Itapema - SC", origin: "Indicação", temperature: "quente", interest: "Vista mar e lazer premium", propertyIndex: 1, status: "proposta" },
  { name: "Marcos Vinicius", phone: "47991230010", city: "Balneário Piçarras - SC", origin: "Portal", temperature: "morno", interest: "Casa em condomínio fechado", propertyIndex: 14, status: "qualificado" },
  { name: "Aline Barbosa", phone: "47991230011", city: "São José - SC", origin: "Instagram", temperature: "frio", interest: "Apartamento mobiliado para locação", propertyIndex: 6, status: "novo" },
  { name: "Leandro Teixeira", phone: "47991230012", city: "Itajaí - SC", origin: "Site", temperature: "quente", interest: "Cobertura com piscina privativa", propertyIndex: 4, status: "visita" },
  { name: "Bianca Dias", phone: "47991230013", city: "São Paulo - SP", origin: "Google", temperature: "morno", interest: "Lançamento com parcelamento", propertyIndex: 12, status: "contatado" },
  { name: "Eduardo Castro", phone: "47991230014", city: "Rio de Janeiro - RJ", origin: "Instagram", temperature: "frio", interest: "Apartamento premium para temporada longa", propertyIndex: 13, status: "novo" },
  { name: "Renata Martins", phone: "47991230015", city: "Florianópolis - SC", origin: "WhatsApp", temperature: "quente", interest: "Alto padrão em Meia Praia", propertyIndex: 1, status: "qualificado" },
  { name: "Tiago Gomes", phone: "47991230016", city: "Blumenau - SC", origin: "Portal", temperature: "morno", interest: "Lançamento 3 dormitórios", propertyIndex: 2, status: "novo" },
  { name: "Carolina Ribeiro", phone: "47991230017", city: "Itapema - SC", origin: "Site", temperature: "quente", interest: "Cobertura duplex ampla", propertyIndex: 0, status: "proposta" },
  { name: "Felipe Moreira", phone: "47991230018", city: "Curitiba - PR", origin: "Indicação", temperature: "frio", interest: "Locação anual 2 dormitórios", propertyIndex: 3, status: "contatado" },
  { name: "Sofia Mendes", phone: "47991230019", city: "Joinville - SC", origin: "Facebook Ads", temperature: "morno", interest: "Apartamento com vista mar", propertyIndex: 5, status: "qualificado" },
  { name: "Caio Oliveira", phone: "47991230020", city: "Porto Alegre - RS", origin: "Instagram", temperature: "quente", interest: "Cobertura linear exclusiva", propertyIndex: 9, status: "ganho" },
  { name: "Natalia Azevedo", phone: "47991230021", city: "Itapema - SC", origin: "WhatsApp", temperature: "quente", interest: "Apartamento 4 dormitórios quadra mar", propertyIndex: 8, status: "proposta" },
  { name: "Rafael Pires", phone: "47991230022", city: "Florianópolis - SC", origin: "Portal", temperature: "morno", interest: "Lançamento vista atlântica", propertyIndex: 12, status: "novo" },
  { name: "Isabela Ramos", phone: "47991230023", city: "Balneário Camboriú - SC", origin: "Site", temperature: "frio", interest: "Loft de luxo para locação", propertyIndex: 11, status: "contatado" },
  { name: "Henrique Nogueira", phone: "47991230024", city: "Itajaí - SC", origin: "Instagram", temperature: "quente", interest: "Casa em condomínio fechado", propertyIndex: 14, status: "qualificado" },
  { name: "Marina Cruz", phone: "47991230025", city: "São José - SC", origin: "Google", temperature: "morno", interest: "Apartamento para moradia anual", propertyIndex: 6, status: "novo" },
  { name: "Paulo Henrique", phone: "47991230026", city: "Curitiba - PR", origin: "Indicação", temperature: "quente", interest: "Imóvel de investimento alto padrão", propertyIndex: 7, status: "visita" },
  { name: "Amanda Vieira", phone: "47991230027", city: "Itapema - SC", origin: "Instagram", temperature: "quente", interest: "Apartamento 3 dormitórios com suíte master", propertyIndex: 1, status: "ganho" },
  { name: "Vinicius Lopes", phone: "47991230028", city: "Blumenau - SC", origin: "Portal", temperature: "frio", interest: "Lançamento com lazer completo", propertyIndex: 2, status: "novo" },
  { name: "Gabriela Prado", phone: "47991230029", city: "Joinville - SC", origin: "WhatsApp", temperature: "morno", interest: "Cobertura frente mar", propertyIndex: 0, status: "qualificado" },
  { name: "Otavio Santos", phone: "47991230030", city: "Porto Alegre - RS", origin: "Site", temperature: "quente", interest: "Apartamento para locação anual", propertyIndex: 3, status: "contatado" },
  { name: "Clara Barbosa", phone: "47991230031", city: "Itapema - SC", origin: "Instagram", temperature: "quente", interest: "Cobertura com terraço gourmet", propertyIndex: 4, status: "proposta" },
  { name: "Murilo Fernandes", phone: "47991230032", city: "Curitiba - PR", origin: "Facebook Ads", temperature: "frio", interest: "Apartamento 2 dormitórios", propertyIndex: 10, status: "novo" },
  { name: "Joana Lima", phone: "47991230033", city: "Florianópolis - SC", origin: "Indicação", temperature: "morno", interest: "Lançamento 4 suítes", propertyIndex: 2, status: "qualificado" },
  { name: "Diego Campos", phone: "47991230034", city: "Itapema - SC", origin: "Site", temperature: "quente", interest: "Apartamento com vista definitiva", propertyIndex: 5, status: "visita" },
  { name: "Helena Moraes", phone: "47991230035", city: "Balneário Camboriú - SC", origin: "Google", temperature: "morno", interest: "Locação anual premium", propertyIndex: 6, status: "contatado" },
  { name: "Arthur Ferreira", phone: "47991230036", city: "Joinville - SC", origin: "Instagram", temperature: "quente", interest: "Cobertura linear exclusiva", propertyIndex: 9, status: "ganho" },
  { name: "Mirela Costa", phone: "47991230037", city: "Itapema - SC", origin: "WhatsApp", temperature: "frio", interest: "Apartamento para segunda residência", propertyIndex: 1, status: "novo" },
  { name: "Vitor Hugo", phone: "47991230038", city: "São Paulo - SP", origin: "Portal", temperature: "morno", interest: "Casa em condomínio", propertyIndex: 14, status: "qualificado" },
  { name: "Laís Monteiro", phone: "47991230039", city: "Curitiba - PR", origin: "Site", temperature: "quente", interest: "Cobertura duplex frente mar", propertyIndex: 0, status: "proposta" },
  { name: "Pedro Henrique", phone: "47991230040", city: "Itajaí - SC", origin: "Instagram", temperature: "quente", interest: "Lançamento vista atlântica", propertyIndex: 12, status: "ganho" },
  { name: "Bruna Alves", phone: "47991230041", city: "Porto Alegre - RS", origin: "Indicação", temperature: "morno", interest: "Apartamento 3 suítes", propertyIndex: 5, status: "novo" },
  { name: "Renan Faria", phone: "47991230042", city: "Florianópolis - SC", origin: "Facebook Ads", temperature: "frio", interest: "Locação anual 2 dormitórios", propertyIndex: 3, status: "contatado" },
  { name: "Larissa Moura", phone: "47991230043", city: "Itapema - SC", origin: "Site", temperature: "quente", interest: "Apartamento alto padrão 3 dormitórios", propertyIndex: 1, status: "qualificado" },
  { name: "Igor Matos", phone: "47991230044", city: "São José - SC", origin: "WhatsApp", temperature: "morno", interest: "Cobertura com terraço gourmet", propertyIndex: 4, status: "novo" },
  { name: "Monique Freitas", phone: "47991230045", city: "Joinville - SC", origin: "Instagram", temperature: "quente", interest: "Apartamento quadra mar 4 dormitórios", propertyIndex: 8, status: "ganho" },
];

const quizSeeds = [
  { profile: "Família em expansão", budget: "Até R$ 2,5 milhões", intent: "Compra", timeline: "3 a 6 meses", propertyType: "Apartamento 3 dormitórios", location: "Meia Praia", answer: "Buscando espaço, segurança e lazer para filhos em idade escolar." },
  { profile: "Investidor recorrente", budget: "R$ 3 milhões a R$ 5 milhões", intent: "Compra", timeline: "Imediato", propertyType: "Cobertura", location: "Meia Praia", answer: "Quer liquidez, valorização e potencial de revenda com margem." },
  { profile: "Moradia anual", budget: "Até R$ 9 mil/mês", intent: "Locação", timeline: "30 dias", propertyType: "Apartamento 2 dormitórios", location: "Meia Praia", answer: "Precisa de contrato anual, boa vaga de garagem e mobília parcial." },
  { profile: "Cliente premium", budget: "Acima de R$ 6 milhões", intent: "Compra", timeline: "Até 90 dias", propertyType: "Cobertura duplex", location: "Quadra mar", answer: "Procura exclusividade, vista aberta e área gourmet para receber." },
  { profile: "Casal recém-casado", budget: "Até R$ 1,4 milhão", intent: "Compra", timeline: "6 a 12 meses", propertyType: "Apartamento 2 dormitórios", location: "Itapema", answer: "Valoriza praticidade, condomínio completo e possibilidade de financiamento." },
  { profile: "Renda com aluguel", budget: "R$ 1,8 milhão a R$ 2,8 milhões", intent: "Compra", timeline: "60 dias", propertyType: "Apartamento 3 dormitórios", location: "Meia Praia", answer: "Busca retorno com locação anual e histórico de ocupação estável." },
  { profile: "Família do interior", budget: "R$ 2 milhões a R$ 3 milhões", intent: "Compra", timeline: "3 meses", propertyType: "Apartamento 4 dormitórios", location: "Meia Praia", answer: "Quer apartamento amplo para uso de férias e temporadas longas." },
  { profile: "Executivo remoto", budget: "Até R$ 12 mil/mês", intent: "Locação", timeline: "Imediato", propertyType: "Loft premium", location: "Itapema", answer: "Procura internet estável, vista agradável e ambiente moderno." },
  { profile: "Cliente de alto padrão", budget: "R$ 4 milhões a R$ 7 milhões", intent: "Compra", timeline: "90 dias", propertyType: "Cobertura linear", location: "Centro", answer: "Quer acabamento diferenciado, terraço amplo e privacidade." },
  { profile: "Mudança de cidade", budget: "Até R$ 2 milhões", intent: "Compra", timeline: "3 a 6 meses", propertyType: "Apartamento 3 dormitórios", location: "Morretes", answer: "Prioriza localização estratégica e escola próxima." },
  { profile: "Segundo imóvel", budget: "R$ 2,5 milhões a R$ 4 milhões", intent: "Compra", timeline: "Até 6 meses", propertyType: "Apartamento vista mar", location: "Meia Praia", answer: "Deseja combinar lazer com preservação patrimonial." },
  { profile: "Renda mensal", budget: "Até R$ 8 mil/mês", intent: "Locação", timeline: "30 dias", propertyType: "Apartamento mobiliado", location: "Meia Praia", answer: "Precisa de entrada rápida e contrato transparente." },
  { profile: "Aposentadoria planejada", budget: "R$ 1,2 milhão a R$ 2 milhões", intent: "Compra", timeline: "6 meses", propertyType: "Apartamento 2 dormitórios", location: "Itapema", answer: "Busca conforto, elevador, acessibilidade e vista agradável." },
  { profile: "Compra para filho", budget: "Até R$ 1,6 milhão", intent: "Compra", timeline: "Imediato", propertyType: "Apartamento 2 dormitórios", location: "Meia Praia", answer: "Quer segurança para o estudante e boa revenda futura." },
  { profile: "Grupo familiar", budget: "Até R$ 3,8 milhões", intent: "Compra", timeline: "3 meses", propertyType: "Apartamento 4 dormitórios", location: "Quadra mar", answer: "Necessita planta ampla, suíte master e áreas de convivência confortáveis." },
  { profile: "Atendimento de pronta compra", budget: "Até R$ 2,2 milhões", intent: "Compra", timeline: "Imediato", propertyType: "Apartamento 3 dormitórios", location: "Centro", answer: "Já tem crédito aprovado e quer fechar visita rapidamente." },
  { profile: "Locação executiva", budget: "Até R$ 10 mil/mês", intent: "Locação", timeline: "15 dias", propertyType: "Apartamento alto padrão", location: "Meia Praia", answer: "Precisa de contrato anual com boa localização e mobília elegante." },
  { profile: "Primeiro imóvel", budget: "Até R$ 1,1 milhão", intent: "Compra", timeline: "6 a 9 meses", propertyType: "Apartamento 2 dormitórios", location: "Itapema", answer: "Ainda comparando bairros e condições de financiamento." },
  { profile: "Expansão patrimonial", budget: "R$ 5 milhões a R$ 8 milhões", intent: "Compra", timeline: "30 a 60 dias", propertyType: "Cobertura premium", location: "Meia Praia", answer: "Busca produto raro, prestígio e possibilidade de personalização." },
  { profile: "Investidor conservador", budget: "R$ 1,5 milhão a R$ 2,5 milhões", intent: "Compra", timeline: "Até 120 dias", propertyType: "Apartamento 2 dormitórios", location: "Itapema", answer: "Quer segurança jurídica e bom potencial de aluguel anual." },
];

async function cleanDemo() {
  const [existingDemoUser] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, "demo@leadlink.com.br"))
    .limit(1);

  const demoOrgUsers = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.organizationId, DEMO_ORG_ID));

  const userIds = Array.from(
    new Set(
      [DEMO_USER_ID, existingDemoUser?.id, ...demoOrgUsers.map((user) => user.id)].filter(Boolean),
    ),
  ) as string[];

  const [org] = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, DEMO_ORG_ID))
    .limit(1);

  const leadIds = (await db
    .select({ id: schema.leads.id })
    .from(schema.leads)
    .where(inArray(schema.leads.brokerId, userIds)))
    .map((row) => row.id);

  if (leadIds.length) {
    await db.delete(schema.chatMessages).where(inArray(schema.chatMessages.leadId, leadIds));
    await db.delete(schema.activities).where(inArray(schema.activities.leadId, leadIds));
    await db.delete(schema.appointments).where(inArray(schema.appointments.leadId, leadIds));
    await db.delete(schema.leads).where(inArray(schema.leads.id, leadIds));
  }

  await db.delete(schema.appointments).where(inArray(schema.appointments.brokerId, userIds));
  await db.delete(schema.properties).where(inArray(schema.properties.brokerId, userIds));
  await db.delete(schema.integrationSettings).where(inArray(schema.integrationSettings.userId, userIds));
  await db
    .delete(schema.meuLinkConfigs)
    .where(or(eq(schema.meuLinkConfigs.slug, DEMO_SLUG), inArray(schema.meuLinkConfigs.userId, userIds)));
  await db.delete(schema.session).where(inArray(schema.session.userId, userIds));
  await db.delete(schema.account).where(inArray(schema.account.userId, userIds));
  await db.delete(schema.user).where(inArray(schema.user.id, userIds));
  if (org) {
    await db.delete(schema.organizations).where(eq(schema.organizations.id, DEMO_ORG_ID));
  }
}

async function seedDemo() {
  if (process.env.NODE_ENV === "production") {
    console.error("Seed demo abortado: execução bloqueada em produção.");
    process.exit(1);
  }

  if (!DEMO_ENV_PASSWORD) {
    console.error("Seed demo abortado: defina DEMO_USER_PASSWORD no .env.");
    process.exit(1);
  }

  console.log("🌱 Iniciando seed da conta demo LeadLink...");
  await cleanDemo();

  const passwordHash = await bcrypt.hash(DEMO_ENV_PASSWORD, 10);

  await db.insert(schema.plans).values({
    id: "plan_demo_comercial",
    name: "Demo Comercial",
    slug: "demo-comercial",
    description: "Plano interno para demonstração comercial",
    priceMonthly: 0,
    setupFee: 0,
    maxUsers: 10,
    maxProperties: 100,
    maxLeadsPerMonth: 1000,
    maxCustomForms: 10,
    hasCrm: true,
    hasAdvancedDashboard: true,
    hasCustomBranding: true,
    hasTeamManagement: true,
    hasLeadDistribution: true,
    hasPrioritySupport: true,
    showLeadlinkBranding: false,
    isActive: true,
  }).onConflictDoNothing({ target: schema.plans.id });

  await db.insert(schema.organizations).values({
    id: DEMO_ORG_ID,
    name: "Imobiliária Vista Mar Prime",
    planId: "plan_demo_comercial",
    subscriptionStatus: "active",
  });

  await db.insert(schema.user).values({
    id: DEMO_USER_ID,
    name: "Sandra Lima",
    email: "demo@leadlink.com.br",
    emailVerified: true,
    role: "admin",
    initials: "SL",
    organizationId: DEMO_ORG_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(schema.account).values({
    id: "demo-account-vista-mar-prime",
    accountId: DEMO_USER_ID,
    providerId: "credential",
    userId: DEMO_USER_ID,
    password: passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(schema.meuLinkConfigs).values({
    slug: DEMO_SLUG,
    userId: DEMO_USER_ID,
    data: {
      title: "Imobiliária Vista Mar Prime",
      city: "Itapema - SC",
      segment: "Imóveis de alto padrão, locação anual e lançamentos",
    },
  });

  const propertyIds: string[] = [];
  for (let i = 0; i < propertySeeds.length; i++) {
    const item = propertySeeds[i];
    const propertyId = `demo-property-${String(i + 1).padStart(2, "0")}`;
    propertyIds.push(propertyId);
    await db.insert(schema.properties).values({
      id: propertyId,
      code: `VMP-${String(i + 1).padStart(3, "0")}`,
      title: item.title,
      type: item.type,
      businessType: item.businessType,
      status: item.status,
      price: item.price,
      area: item.area,
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      parking: item.parking,
      neighborhood: item.neighborhood,
      city: "Itapema",
      brokerId: DEMO_USER_ID,
      image: demoPropertyImages[i % demoPropertyImages.length],
      images: [demoPropertyImages[i % demoPropertyImages.length]],
      highlight: item.highlight ? "true" : null,
      description: item.description,
      views: 100 + i * 37,
      leadsCount: 3 + (i % 9),
      createdAt: new Date(Date.now() - i * 86400000),
    });
  }

  const leadIds: string[] = [];
  for (let i = 0; i < leadSeeds.length; i++) {
    const item = leadSeeds[i];
    const leadId = `demo-lead-${String(i + 1).padStart(2, "0")}`;
    leadIds.push(leadId);
    const createdAt = new Date(Date.now() - (i % 18) * 86400000);
    const relatedPropertyId = item.propertyIndex != null ? propertyIds[item.propertyIndex] : null;
    const notes = [
      `Temperatura: ${item.temperature}`,
      `Cidade: ${item.city}`,
      relatedPropertyId ? `Imóvel de interesse: ${propertySeeds[item.propertyIndex].title}` : "",
    ].filter(Boolean).join("\n");

    await db.insert(schema.leads).values({
      id: leadId,
      name: item.name,
      phone: item.phone,
      email: `${item.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, ".")}@example.com`,
      source: item.origin,
      status: item.status,
      score: item.temperature === "quente" ? 85 : item.temperature === "morno" ? 60 : 35,
      interest: item.interest,
      budget: item.temperature === "quente" ? "Alta intenção" : item.temperature === "morno" ? "Média intenção" : "Exploratória",
      region: item.city,
      timeline: item.temperature === "quente" ? "Até 90 dias" : "3 a 6 meses",
      brokerId: DEMO_USER_ID,
      notes,
      createdAt,
      lastContact: createdAt,
    });

    await db.insert(schema.activities).values([
      { leadId, type: "criado", text: `Lead capturado via ${item.origin}`, createdAt },
      { leadId, type: "nota", text: `Perfil: ${item.temperature} | ${item.city}`, createdAt: new Date(createdAt.getTime() + 60000) },
      { leadId, type: "mensagem", text: "Contato inicial registrado no CRM demo.", createdAt: new Date(createdAt.getTime() + 120000) },
    ]);

    const quiz = quizSeeds[i % quizSeeds.length];

    await db.insert(schema.chatMessages).values([
      { leadId, from: "broker", text: `Olá ${item.name.split(" ")[0]}! Recebi sua solicitação e vou te mostrar opções em ${item.city}.`, createdAt: new Date(createdAt.getTime() + 180000) },
      { leadId, from: "lead", text: quiz.answer, createdAt: new Date(createdAt.getTime() + 240000) },
      { leadId, from: "broker", text: `Perfeito. Pelo seu perfil (${quiz.profile}), vou priorizar ${quiz.propertyType} em ${quiz.location}.`, createdAt: new Date(createdAt.getTime() + 300000) },
    ]);
  }

  const appointments = [
    { title: "Visita Cobertura Frente Mar", type: "Visita", leadName: leadSeeds[0].name, leadId: leadIds[0], propertyTitle: propertySeeds[0].title, propertyId: propertyIds[0], date: new Date(Date.now() + 2 * 86400000), duration: 60, location: "Meia Praia, Itapema", status: "confirmado" },
    { title: "Apresentação de Lançamento", type: "Reunião", leadName: leadSeeds[2].name, leadId: leadIds[2], propertyTitle: propertySeeds[2].title, propertyId: propertyIds[2], date: new Date(Date.now() + 86400000), duration: 45, location: "Escritório Vista Mar Prime", status: "confirmado" },
    { title: "Retorno sobre locação anual", type: "Ligação", leadName: leadSeeds[3].name, leadId: leadIds[3], propertyTitle: propertySeeds[3].title, propertyId: propertyIds[3], date: new Date(Date.now() + 3 * 86400000), duration: 20, location: "Telefone", status: "pendente" },
  ];

  for (const ap of appointments) {
    await db.insert(schema.appointments).values({
      title: ap.title,
      type: ap.type,
      leadName: ap.leadName,
      leadId: ap.leadId,
      propertyTitle: ap.propertyTitle,
      propertyId: ap.propertyId,
      brokerId: DEMO_USER_ID,
      date: ap.date,
      duration: ap.duration,
      location: ap.location,
      status: ap.status,
    });
  }

  console.log("✓ Conta demo criada com sucesso");
  console.log(`Login: demo@leadlink.com.br / ${DEMO_PASSWORD}`);
  await client.end();
}

seedDemo().catch((err) => {
  console.error("Erro no seed demo:", err);
  process.exit(1);
});
