import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { db } from "@/db";
import { leads, activities, chatMessages, user, meuLinkConfigs, organizations, plans } from "@/db/schema";
import { and, eq, desc, count, gt, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { emitLeadCreatedWebhook } from "@/server-fns/webhook-dispatch";
import { ensureOrgAndGetLimits } from "@/server-fns/plans";
import { assertCanCaptureLead } from "@/lib/permissions";
import { createHash } from "node:crypto";
import { scoreLeadAnswers } from "@/lib/lead-scorer";
import { buildWhatsappMessage } from "@/lib/whatsapp-message";
import { getEffectivePlanSlug, getLeadVisibilityForUser } from "@/lib/plans";

const publicLeadAttempts = new Map<string, number[]>();
const PUBLIC_LEAD_WINDOW_MS = 10 * 60 * 1000;
const PUBLIC_LEAD_MAX_ATTEMPTS = 5;
type LeadScoreDetail = { criteria: Array<{ label: string; points: number }> };

type QuizAnswersMap = Record<string, unknown>;

function safeJsonParse(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    return JSON.parse(trimmed) as {
      intentType?: unknown;
      quizAnswers?: QuizAnswersMap;
      summary?: unknown;
    };
  } catch {
    return null;
  }
}

function normalizeQuizAnswers(input: unknown): QuizAnswersMap | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  return input as QuizAnswersMap;
}

function extractStructuredLeadData(notes?: string | null) {
  const parsed = safeJsonParse(notes);
  const quizAnswers = normalizeQuizAnswers(parsed?.quizAnswers) ?? null;
  const intentType =
    parsed &&
    typeof parsed.intentType === "string" &&
    ["locacao", "compra", "investimento"].includes(parsed.intentType)
      ? (parsed.intentType as "locacao" | "compra" | "investimento")
      : null;
  return { intentType, quizAnswers, notesJson: parsed };
}

function getClientIp() {
  const request = getRequest();
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  const raw = cfConnectingIp || realIp || forwardedFor?.split(",")[0]?.trim() || "unknown";
  return raw;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function rateLimitPublicLead(keyParts: string[]) {
  const now = Date.now();
  const key = createHash("sha256").update(keyParts.join("|")).digest("hex");
  const attempts = publicLeadAttempts.get(key) || [];
  const recent = attempts.filter((timestamp) => now - timestamp < PUBLIC_LEAD_WINDOW_MS);
  if (recent.length >= PUBLIC_LEAD_MAX_ATTEMPTS) {
    throw new Error("Muitas tentativas. Tente novamente em alguns minutos.");
  }
  recent.push(now);
  publicLeadAttempts.set(key, recent);
}

async function requireSession() {
  const request = getRequest();
  let session = null;
  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    console.error("[requireSession]", error);
    return null;
  }
  if (!session) throw new Error("Não autenticado");
  return session;
}

async function requireLeadOwnership(
  leadId: string,
  session: NonNullable<Awaited<ReturnType<typeof requireSession>>>,
) {
  const [lead] = await db
    .select({
      id: leads.id,
      brokerId: leads.brokerId,
      brokerOrganizationId: user.organizationId,
    })
    .from(leads)
    .leftJoin(user, eq(leads.brokerId, user.id))
    .where(eq(leads.id, leadId));

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  const userOrgId = (session.user as any).organizationId as string | undefined;
  if (
    lead.brokerId !== session.user.id &&
    (!userOrgId || lead.brokerOrganizationId !== userOrgId)
  ) {
    throw new Error("Unauthorized");
  }

  return lead;
}

async function requireBrokerOwnership(
  brokerId: string | null | undefined,
  organizationId: string | undefined,
) {
  if (!brokerId) return;

  const [broker] = await db
    .select({
      id: user.id,
      organizationId: user.organizationId,
    })
    .from(user)
    .where(eq(user.id, brokerId));

  if (!broker || !organizationId || broker.organizationId !== organizationId) {
    throw new Error("Unauthorized");
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getLeads = createServerFn({ method: "GET" }).handler(async (): Promise<any> => {
  const session = await requireSession();
  if (!session) return [];
  const currentSession = session as NonNullable<typeof session>;
  const [planRow] = await db
    .select({ organizationPlanSlug: plans.slug })
    .from(user)
    .leftJoin(organizations, eq(user.organizationId, organizations.id))
    .leftJoin(plans, eq(organizations.planId, plans.id))
    .where(eq(user.id, currentSession.user.id))
    .limit(1);
  const effectivePlanSlug = getEffectivePlanSlug({
    planSlug: (currentSession.user as any).planSlug,
    organizationPlanSlug: planRow?.organizationPlanSlug ?? null,
  });

  const base = db
    .select({
      id: leads.id,
      name: leads.name,
      phone: leads.phone,
      email: leads.email,
      intentType: leads.intentType,
      quizAnswers: leads.quizAnswers as any,
      source: leads.source,
      status: leads.status,
      score: leads.score,
      classification: leads.classification,
      urgency: leads.urgency,
      budgetRange: leads.budgetRange,
      scoreDetail: leads.scoreDetail as any,
      nextStep: leads.nextStep,
      profileSummary: leads.profileSummary,
      interest: leads.interest,
      budget: leads.budget,
      region: leads.region,
      timeline: leads.timeline,
      brokerId: leads.brokerId,
      notes: leads.notes,
      createdAt: leads.createdAt,
      lastContact: leads.lastContact,
      brokerName: user.name,
      brokerInitials: user.initials,
    })
    .from(leads)
    .leftJoin(user, eq(leads.brokerId, user.id));

  const rows = await base
    .where(eq(leads.brokerId, currentSession.user.id))
    .orderBy(desc(leads.createdAt));
  return rows.map((lead, index) => {
    const visibility =
      (currentSession.user as any).role === "admin"
        ? { masked: false, isBlocked: false }
        : getLeadVisibilityForUser({ planSlug: effectivePlanSlug }, index);
    if (!visibility.masked) return { ...lead, isBlocked: false };
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
  });
});

const _searchLeads = createServerFn({ method: "GET" }).handler(async (ctx): Promise<any> => {
  const query = String(ctx.data ?? "").trim();
  if (query.length < 2) return [];
  const session = await requireSession();
  if (!session) return [];
  const currentSession = session as NonNullable<typeof session>;
  const [planRow] = await db
    .select({ organizationPlanSlug: plans.slug })
    .from(user)
    .leftJoin(organizations, eq(user.organizationId, organizations.id))
    .leftJoin(plans, eq(organizations.planId, plans.id))
    .where(eq(user.id, currentSession.user.id))
    .limit(1);
  const effectivePlanSlug = getEffectivePlanSlug({
    planSlug: (currentSession.user as any).planSlug,
    organizationPlanSlug: planRow?.organizationPlanSlug ?? null,
  });
  const normalizedQuery = query.toLowerCase();
  const rows = await db
    .select({
      id: leads.id,
      name: leads.name,
      phone: leads.phone,
      source: leads.source,
      status: leads.status,
      score: leads.score,
      region: leads.region,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(eq(leads.brokerId, currentSession.user.id))
    .orderBy(desc(leads.createdAt));

  return rows
    .map((lead, index) => {
      const visibility =
        (currentSession.user as any).role === "admin"
          ? { masked: false, isBlocked: false }
          : getLeadVisibilityForUser({ planSlug: effectivePlanSlug }, index);
      return { ...lead, isBlocked: visibility.masked };
    })
    .filter((lead) => !lead.isBlocked)
    .filter((lead) =>
      [lead.name, lead.phone, lead.region, lead.source].some((value) =>
        String(value || "").toLowerCase().includes(normalizedQuery),
      ),
    )
    .slice(0, 8) as any;
});

export const searchLeads = _searchLeads as unknown as (opts: {
  data: string;
}) => ReturnType<typeof _searchLeads>;

export const getBrokers = createServerFn({ method: "GET" }).handler(async () => {
  const session = (await requireSession()) as NonNullable<
    Awaited<ReturnType<typeof requireSession>>
  >;
  const isAdmin = (session.user as any).role === "admin";

  const currentUser = await db
    .select({ organizationId: user.organizationId })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const orgId = currentUser[0]?.organizationId;

  const base = db
    .select({
      id: user.id,
      name: user.name,
      initials: user.initials,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    })
    .from(user)
    .orderBy(desc(user.createdAt));

  // A lista de corretores só pode ser global para admin explícito.
  return isAdmin
    ? base
    : orgId
      ? base.where(eq(user.organizationId, orgId))
      : base.where(eq(user.id, session.user.id));
});

const _getLead = createServerFn({ method: "GET" }).handler(async (ctx): Promise<any> => {
  const id = ctx.data as unknown as string;
  const currentSession = (await requireSession()) as NonNullable<
    Awaited<ReturnType<typeof requireSession>>
  >;
  const [planRow] = await db
    .select({ organizationPlanSlug: plans.slug })
    .from(user)
    .leftJoin(organizations, eq(user.organizationId, organizations.id))
    .leftJoin(plans, eq(organizations.planId, plans.id))
    .where(eq(user.id, currentSession.user.id))
    .limit(1);
  const effectivePlanSlug = getEffectivePlanSlug({
    planSlug: (currentSession.user as any).planSlug,
    organizationPlanSlug: planRow?.organizationPlanSlug ?? null,
  });

  const [lead] = await db
    .select({
      id: leads.id,
      name: leads.name,
      phone: leads.phone,
      email: leads.email,
      intentType: leads.intentType,
      quizAnswers: leads.quizAnswers as any,
      source: leads.source,
      status: leads.status,
      score: leads.score,
      classification: leads.classification,
      urgency: leads.urgency,
      budgetRange: leads.budgetRange,
      scoreDetail: leads.scoreDetail as any,
      nextStep: leads.nextStep,
      profileSummary: leads.profileSummary,
      interest: leads.interest,
      budget: leads.budget,
      region: leads.region,
      timeline: leads.timeline,
      brokerId: leads.brokerId,
      notes: leads.notes,
      createdAt: leads.createdAt,
      lastContact: leads.lastContact,
      brokerName: user.name,
      brokerInitials: user.initials,
      brokerEmail: user.email,
    })
    .from(leads)
    .leftJoin(user, eq(leads.brokerId, user.id))
    .where(and(eq(leads.id, id), eq(leads.brokerId, currentSession.user.id)));

  if (!lead) return null;

  const activity = await db
    .select()
    .from(activities)
    .where(eq(activities.leadId, id))
    .orderBy(desc(activities.createdAt));

  const chat = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.leadId, id))
    .orderBy(chatMessages.createdAt);

  const [newerCount] = await db
    .select({ count: count() })
    .from(leads)
    .where(
      and(
        eq(leads.brokerId, currentSession.user.id),
        or(
          gt(leads.createdAt, lead.createdAt),
          and(eq(leads.createdAt, lead.createdAt), gt(leads.id, lead.id)),
        ),
      ),
    );
  const visibility =
    (currentSession.user as any).role === "admin"
      ? { masked: false, isBlocked: false }
      : getLeadVisibilityForUser({ planSlug: effectivePlanSlug }, Number(newerCount?.count ?? 0));
  return visibility.masked
    ? {
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
        activity: [],
        chat: [],
        isBlocked: true,
      }
    : { ...lead, activity, chat, isBlocked: false };
});

export const getLead = _getLead as unknown as (opts: {
  data: string;
}) => ReturnType<typeof _getLead>;

// ─── Mutações ─────────────────────────────────────────────────────────────────

type CreateLeadInput = {
  name: string;
  phone: string;
  email?: string;
  source: string;
  interest?: string;
  budget?: string;
  region?: string;
  timeline?: string;
  brokerId?: string;
  notes?: string;
};

const _createLead = createServerFn({ method: "POST" }).handler(async (ctx): Promise<any> => {
  const data = ctx.data as unknown as CreateLeadInput;
  const currentSession = (await requireSession()) as NonNullable<
    Awaited<ReturnType<typeof requireSession>>
  >;
  const brokerId = data.brokerId || currentSession.user.id;

  // Admins têm acesso irrestrito; corretores respeitam o limite do plano
  const isAdmin = (currentSession.user as any).role === "admin";
  if (!isAdmin) {
    const { limits, usage } = await ensureOrgAndGetLimits(brokerId);
    assertCanCaptureLead(limits, usage);
  }

  const [lead] = await db
    .insert(leads)
    .values({ ...data, brokerId, status: "novo", score: 50 })
    .returning();

  if (lead.brokerId === "demo" || lead.brokerId === "test") {
    console.warn("[createLead] lead com brokerId suspeito", {
      leadId: lead.id,
      brokerId: lead.brokerId,
    });
  }

  await db.insert(activities).values({
    leadId: lead.id,
    type: "criado",
    text: `Lead criado via ${data.source}`,
  });

  return lead;
});

export const createLead = _createLead as unknown as (opts: {
  data: CreateLeadInput;
}) => ReturnType<typeof _createLead>;

const _updateLeadStatus = createServerFn({ method: "POST" }).handler(async (ctx): Promise<any> => {
  const data = ctx.data as unknown as { id: string; status: string };
  const currentSession = (await requireSession()) as NonNullable<
    Awaited<ReturnType<typeof requireSession>>
  >;
  await requireLeadOwnership(data.id, currentSession);
  const [lead] = await db
    .update(leads)
    .set({ status: data.status, lastContact: new Date() })
    .where(eq(leads.id, data.id))
    .returning();

  await db.insert(activities).values({
    leadId: data.id,
    type: "status",
    text: `Status alterado para ${data.status}`,
  });

  return lead;
});

export const updateLeadStatus = _updateLeadStatus as unknown as (opts: {
  data: { id: string; status: string };
}) => ReturnType<typeof _updateLeadStatus>;

const _updateLeadNotes = createServerFn({ method: "POST" }).handler(async (ctx): Promise<any> => {
  const data = ctx.data as unknown as { id: string; notes: string };
  const currentSession = (await requireSession()) as NonNullable<
    Awaited<ReturnType<typeof requireSession>>
  >;
  await requireLeadOwnership(data.id, currentSession);
  const [lead] = await db
    .update(leads)
    .set({ notes: data.notes })
    .where(eq(leads.id, data.id))
    .returning();
  return lead;
});

export const updateLeadNotes = _updateLeadNotes as unknown as (opts: {
  data: { id: string; notes: string };
}) => ReturnType<typeof _updateLeadNotes>;

const _updateLeadBroker = createServerFn({ method: "POST" }).handler(async (ctx): Promise<any> => {
  const data = ctx.data as unknown as { id: string; brokerId: string | null };
  const currentSession = (await requireSession()) as NonNullable<
    Awaited<ReturnType<typeof requireSession>>
  >;
  await requireLeadOwnership(data.id, currentSession);
  await requireBrokerOwnership(
    data.brokerId,
    (currentSession.user as any).organizationId as string | undefined,
  );
  const [lead] = await db
    .update(leads)
    .set({ brokerId: data.brokerId })
    .where(eq(leads.id, data.id))
    .returning();

  await db.insert(activities).values({
    leadId: data.id,
    type: "reatribuicao",
    text: data.brokerId ? "Lead reatribuído para outro corretor" : "Lead sem corretor atribuído",
  });

  return lead;
});

export const updateLeadBroker = _updateLeadBroker as unknown as (opts: {
  data: { id: string; brokerId: string | null };
}) => ReturnType<typeof _updateLeadBroker>;

const _addChatMessage = createServerFn({ method: "POST" }).handler(async (ctx): Promise<any> => {
  const data = ctx.data as unknown as { leadId: string; from: "broker" | "lead"; text: string };
  const currentSession = (await requireSession()) as NonNullable<
    Awaited<ReturnType<typeof requireSession>>
  >;
  await requireLeadOwnership(data.leadId, currentSession);
  const [msg] = await db.insert(chatMessages).values(data).returning();
  return msg;
});

export const addChatMessage = _addChatMessage as unknown as (opts: {
  data: { leadId: string; from: "broker" | "lead"; text: string };
}) => ReturnType<typeof _addChatMessage>;

type CreatePublicLeadInput = {
  name: string;
  phone: string;
  source?: string;
  city?: string;
  notes?: string;
  originSlug: string;
  originPath?: "atendimento" | "vitrine" | "destaque";
  intentType?: "locacao" | "compra" | "investimento";
  property?: {
    id: string;
    code: string;
    title: string;
    type?: string;
    businessType?: string;
    price?: number;
    neighborhood: string;
    city?: string;
  };
  answers?: Record<string, string>;
  quizAnswers?: Record<string, string>;
};

const ANSWER_LABELS: Record<string, string> = {
  "q-name": "Nome",
  "q-phone": "Telefone",
  "q-intent": "O que você está buscando?",
  "q-city": "Qual cidade ou bairro você procura?",
  "q-property-type": "Qual tipo de imóvel você busca?",
  "q-bedrooms": "Quantos quartos você precisa?",
  "q-rent-budget": "Qual valor mensal aproximado de aluguel?",
  "q-move-time": "Quando pretende se mudar?",
  "q-pets": "Possui pets?",
  "q-observation": "Alguma observação importante?",
  "q-buy-type": "Qual tipo de imóvel deseja comprar?",
  "q-buy-bedrooms": "Quantos quartos você procura?",
  "q-buy-budget": "Qual valor máximo de compra?",
  "q-financing": "Pretende financiar?",
  "q-credit": "Já possui crédito aprovado ou simulação?",
  "q-buy-timeline": "Qual o prazo para compra?",
  "q-invest-region": "Qual cidade ou região de interesse?",
  "q-invest-type": "Qual tipo de oportunidade procura?",
  "q-invest-capital": "Qual capital disponível para investir?",
  "q-invest-goal": "Qual objetivo principal?",
  "q-invest-horizon": "Qual horizonte de investimento?",
  "q-invest-outside": "Aceita oportunidades fora da região principal?",
  "q-interest": "Interesse",
  "q-budget": "Orçamento",
  "q-region": "Cidade/região",
  "q-timeline-buy": "Prazo",
};

function buildNotesSummary(payload: {
  answers?: Record<string, string>;
  quizAnswers?: Record<string, string>;
  intentType?: "locacao" | "compra" | "investimento";
}) {
  const answers = payload.quizAnswers ?? payload.answers;
  if (!answers || !Object.keys(answers).length) return "";
  return JSON.stringify({
    intentType: payload.intentType ?? null,
    quizAnswers: answers,
    summary: Object.entries(answers)
      .map(([key, value]) => `${ANSWER_LABELS[key] || key}: ${value}`)
      .join("\n"),
  });
}

const _createPublicLead = createServerFn({ method: "POST" }).handler(async (ctx): Promise<any> => {
  const data = ctx.data as unknown as CreatePublicLeadInput;
  rateLimitPublicLead([getClientIp(), normalizePhone(data.phone), data.originSlug]);

  const [config] = await db
    .select({
      userId: meuLinkConfigs.userId,
    })
    .from(meuLinkConfigs)
    .where(eq(meuLinkConfigs.slug, data.originSlug));

  if (!config?.userId) {
    throw new Error("Corretor não encontrado");
  }

  // Verifica limite de leads do plano do corretor (cria org lazily se necessário)
  const { limits, usage } = await ensureOrgAndGetLimits(config.userId);
  assertCanCaptureLead(limits, usage);

  const structuredInput = normalizeQuizAnswers(data.quizAnswers ?? data.answers) ?? {};
  const notesSummary = buildNotesSummary({
    answers: data.answers,
    quizAnswers: structuredInput as Record<string, string>,
    intentType: data.intentType,
  });
  const priceLabel =
    typeof data.property?.price === "number"
      ? data.property.price.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0,
        })
      : "";
  const scoring = scoreLeadAnswers({
    intentType: data.intentType ?? null,
    quizAnswers: structuredInput,
    notes: data.notes,
  });
  const quizAnswersJson = structuredInput;
  const quizAnswersForDb = structuredInput as any;
  const propertySummary = data.property
    ? [
        `Imóvel de interesse: ${data.property.code} - ${data.property.title}`,
        data.property.type ? `Tipo: ${data.property.type}` : "",
        data.property.businessType ? `Negócio: ${data.property.businessType}` : "",
        priceLabel ? `Valor: ${priceLabel}` : "",
        data.property.neighborhood || data.property.city
          ? `Local: ${[data.property.neighborhood, data.property.city].filter(Boolean).join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const [lead] = await db
    .insert(leads)
    .values({
      name: data.name,
      phone: data.phone,
      intentType: data.intentType ?? null,
      quizAnswers: quizAnswersForDb as any,
      source: "Meu Link / Quiz",
      status: "novo",
      score: scoring.score,
      classification: scoring.classification,
      urgency: scoring.urgency,
      budgetRange: scoring.budgetRange,
      scoreDetail: scoring.scoreDetail as unknown as LeadScoreDetail,
      nextStep: scoring.nextStep,
      profileSummary: scoring.profileSummary || "Lead antigo sem respostas estruturadas.",
      region: data.city,
      brokerId: config.userId,
      notes: [notesSummary, propertySummary].filter(Boolean).join("\n") || undefined,
    })
    .returning();

  if (lead.brokerId === "demo" || lead.brokerId === "test") {
    console.warn("[createPublicLead] lead com brokerId suspeito", {
      leadId: lead.id,
      brokerId: lead.brokerId,
      slug: data.originSlug,
    });
  }

  await db.insert(activities).values({
    leadId: lead.id,
    type: "criado",
    text: "Lead capturado via link público",
  });

  void emitLeadCreatedWebhook(config.userId, {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    region: lead.region,
    source: lead.source,
    status: lead.status,
    notes: lead.notes,
    createdAt: lead.createdAt,
  });

  return { ok: true, leadId: lead.id };
});

export const createPublicLead = _createPublicLead as unknown as (opts: {
  data: CreatePublicLeadInput;
}) => ReturnType<typeof _createPublicLead>;

const _deleteLead = createServerFn({ method: "POST" }).handler(async (ctx): Promise<any> => {
  const id = ctx.data as unknown as string;
  const session = await requireSession();
  const currentSession = session as NonNullable<typeof session>;
  const isAdmin =
    (currentSession.user as any).role === "admin" ||
    (currentSession.user as any).role === "platform_admin";

  const [lead] = await db
    .select({
      id: leads.id,
      brokerId: leads.brokerId,
    })
    .from(leads)
    .where(eq(leads.id, id));

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  if (!isAdmin && lead.brokerId !== currentSession.user.id) {
    throw new Error("Sem permissão para deletar este lead");
  }

  await db.delete(leads).where(eq(leads.id, id));
  return { success: true };
});

export const deleteLead = _deleteLead as unknown as (opts: {
  data: string;
}) => ReturnType<typeof _deleteLead>;
