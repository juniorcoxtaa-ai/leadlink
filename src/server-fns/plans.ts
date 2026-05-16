import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { db } from "@/db";
import {
  plans,
  organizations,
  subscriptions,
  payments,
  user,
  leads,
  properties,
} from "@/db/schema";
import { eq, and, gte, count, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getLimitsFromPlan, getLimitsFromSlug, PLAN_DEFAULTS, PLAN_PUBLIC_CATALOG } from "@/lib/plans";
import type { PlanLimits, PlanUsage, PlanContext } from "@/lib/plans";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireSession() {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new Error("Não autenticado");
  return session;
}

// ─── Início do mês atual (UTC-safe) ──────────────────────────────────────────

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

// ─── Garante que o usuário tem uma organização (cria se necessário) ───────────
// Seguro contra concorrência: a constraint UNIQUE no slug não existe aqui,
// mas o update final é idempotente — no pior caso cria dois orgs e usa o último.
// Para produção de alta concorrência, usar SELECT FOR UPDATE ou advisory lock.

export async function ensureOrganization(userId: string, userDisplayName: string): Promise<string> {
  // Lê direto do banco (não confia em cache)
  const [u] = await db
    .select({ organizationId: user.organizationId })
    .from(user)
    .where(eq(user.id, userId));

  if (u?.organizationId) return u.organizationId;

  // Busca o plano free pelo slug (mais seguro que hardcode de ID)
  const [freePlan] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.slug, "free"))
    .limit(1);

  // Cria org pessoal — se o plano free não existir ainda no DB, planId fica null
  // e os limites cairão para FREE_DEFAULTS no código
  const [org] = await db
    .insert(organizations)
    .values({
      name: userDisplayName || "Minha organização",
      planId: freePlan?.id ?? null,
      subscriptionStatus: "free",
    })
    .returning({ id: organizations.id });

  // Vincula ao user — se já tiver sido vinculado por outro request concorrente,
  // este update simplesmente sobrescreve (comportamento idempotente aceitável)
  await db.update(user).set({ organizationId: org.id }).where(eq(user.id, userId));

  return org.id;
}

// ─── Helper: nome do usuário pelo ID ─────────────────────────────────────────

async function getUserName(userId: string): Promise<string> {
  const [u] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1);
  return u?.name ?? "Corretor";
}

// ─── Busca limites + uso de qualquer userId (sem criar org) ──────────────────

async function fetchLimitsAndUsage(
  userId: string,
  orgId: string | null,
): Promise<{ limits: PlanLimits; usage: PlanUsage }> {
  const defaultLimits = getLimitsFromSlug("free");

  let limits = defaultLimits;

  if (orgId) {
    const [orgRow] = await db
      .select({ plan: plans })
      .from(organizations)
      .leftJoin(plans, eq(organizations.planId, plans.id))
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (orgRow?.plan) {
      limits = getLimitsFromPlan(orgRow.plan);
    }
  }

  const [propCount] = await db
    .select({ count: count() })
    .from(properties)
    .where(eq(properties.brokerId, userId));

  const [leadCount] = await db
    .select({ count: count() })
    .from(leads)
    .where(and(eq(leads.brokerId, userId), gte(leads.createdAt, startOfCurrentMonth())));

  const usersCount = orgId
    ? ((await db.select({ count: count() }).from(user).where(eq(user.organizationId, orgId)))[0]
        ?.count ?? 1)
    : 1;

  return {
    limits,
    usage: {
      propertiesCount: propCount?.count ?? 0,
      leadsThisMonth: leadCount?.count ?? 0,
      usersCount,
    },
  };
}

// ─── Busca limites do userId (chamado por server fns de criação) ──────────────

export async function getMyLimitsAndUsage(
  userId: string,
): Promise<{ limits: PlanLimits; usage: PlanUsage }> {
  const [u] = await db
    .select({ organizationId: user.organizationId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return fetchLimitsAndUsage(userId, u?.organizationId ?? null);
}

// ─── Garante org E busca limites num round-trip eficiente ────────────────────

export async function ensureOrgAndGetLimits(
  userId: string,
): Promise<{ limits: PlanLimits; usage: PlanUsage }> {
  const [u] = await db
    .select({ organizationId: user.organizationId, name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const orgId = u?.organizationId ?? (await ensureOrganization(userId, u?.name ?? "Corretor"));
  return fetchLimitsAndUsage(userId, orgId);
}

// ─── Contexto completo do plano do usuário atual (server fn pública) ─────────

export const getMyPlanContext = createServerFn({ method: "GET" }).handler(
  async (): Promise<any> => {
    const session = await requireSession();
    const userId = session.user.id;

    // Garante org e busca tudo em sequência eficiente
    const [u] = await db
      .select({ organizationId: user.organizationId, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const orgId =
      u?.organizationId ?? (await ensureOrganization(userId, u?.name ?? session.user.name));

    const [orgRow] = await db
      .select({ org: organizations, plan: plans })
      .from(organizations)
      .leftJoin(plans, eq(organizations.planId, plans.id))
      .where(eq(organizations.id, orgId))
      .limit(1);

    // Fallback seguro: se o plano ainda não existir no DB, usa defaults Free
    const effectivePlan = orgRow?.plan ?? null;
    const limits = effectivePlan ? getLimitsFromPlan(effectivePlan) : PLAN_DEFAULTS.free;

    // Assinatura ativa (para Stripe; pode ser null pré-integração)
    const [activeSub] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.organizationId, orgId),
          inArray(subscriptions.status, ["active", "trialing"]),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const [propCount] = await db
      .select({ count: count() })
      .from(properties)
      .where(eq(properties.brokerId, userId));

    const [leadCount] = await db
      .select({ count: count() })
      .from(leads)
      .where(and(eq(leads.brokerId, userId), gte(leads.createdAt, startOfCurrentMonth())));

    const [userCount] = await db
      .select({ count: count() })
      .from(user)
      .where(eq(user.organizationId, orgId));

    const usage: PlanUsage = {
      propertiesCount: propCount?.count ?? 0,
      leadsThisMonth: leadCount?.count ?? 0,
      usersCount: userCount?.count ?? 1,
    };

    // Garante que org sempre existe no retorno (cria objeto sintético se necessário)
    const safeOrg = orgRow?.org ?? {
      id: orgId,
      name: u?.name ?? session.user.name,
      planId: null,
      stripeCustomerId: null,
      subscriptionStatus: "free" as const,
      trialEndsAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Garante que plan sempre existe (cria objeto sintético Free se necessário)
    const safePlan = effectivePlan ?? {
      id: "plan_free",
      name: "Free",
      slug: "free",
      description: null,
      priceMonthly: 0,
      setupFee: 0,
      ...limits,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      plan: safePlan,
      organization: safeOrg,
      subscription: activeSub ?? null,
      usage,
    };
  },
);

// ─── Lista todos os planos disponíveis (sem auth — página pública de planos) ──

export const getAvailablePlans = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.priceMonthly);
  const bySlug = new Map(rows.map((plan) => [plan.slug, plan] as const));
  return PLAN_PUBLIC_CATALOG.map((canonical) => bySlug.get(canonical.slug) ?? { id: `canonical-${canonical.slug}`, ...canonical, description: canonical.description ?? null, createdAt: new Date(), updatedAt: new Date() });
});

// ─── Admin: lista todas as organizações ──────────────────────────────────────

export const getAdminOrganizations = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireSession();
  if ((session.user as any).role !== "admin") throw new Error("Sem permissão");

  const rows = await db
    .select({
      org: organizations,
      plan: plans,
      ownerName: user.name,
      ownerEmail: user.email,
      ownerCreatedAt: user.createdAt,
    })
    .from(organizations)
    .leftJoin(plans, eq(organizations.planId, plans.id))
    .leftJoin(user, eq(user.organizationId, organizations.id))
    .orderBy(desc(organizations.createdAt))
    .limit(500);

  const seen = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const existing = seen.get(row.org.id);
    if (!existing || (row.ownerCreatedAt ?? 0) < (existing.ownerCreatedAt ?? 0)) {
      seen.set(row.org.id, row);
    }
  }

  return Array.from(seen.values());
});

// ─── Admin: métricas financeiras ─────────────────────────────────────────────

export const getAdminFinanceMetrics = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireSession();
  if ((session.user as any).role !== "admin") throw new Error("Sem permissão");

  const allPlans = await db.select().from(plans).limit(100);
  const planMap = new Map(allPlans.map((p) => [p.id, p]));

  const allOrgs = await db
    .select({
      planId: organizations.planId,
      subscriptionStatus: organizations.subscriptionStatus,
    })
    .from(organizations)
    .limit(1000);

  // MRR pré-Stripe: soma o preço do plano de todas as orgs com status pago
  // Após integrar Stripe, usar a tabela `subscriptions` como fonte de verdade
  const PAID_STATUSES = new Set(["active", "trialing"]);
  const mrr = allOrgs.reduce((sum, org) => {
    if (!PAID_STATUSES.has(org.subscriptionStatus)) return sum;
    const plan = org.planId ? planMap.get(org.planId) : null;
    return sum + (plan?.priceMonthly ?? 0);
  }, 0);

  // Contagem por slug de plano
  const byPlan = { free: 0, pro: 0, comercial: 0 } as Record<string, number>;
  for (const org of allOrgs) {
    const plan = org.planId ? planMap.get(org.planId) : null;
    const slug = plan?.slug ?? "free";
    byPlan[slug] = (byPlan[slug] ?? 0) + 1;
  }

  // Stripe subscriptions (vazio pré-integração)
  const activeStripeSubs = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(inArray(subscriptions.status, ["active", "trialing"]));

  const recentPayments = await db
    .select()
    .from(payments)
    .orderBy(desc(payments.createdAt))
    .limit(50);

  return {
    totalOrganizations: allOrgs.length,
    mrrCents: mrr,
    arrCents: mrr * 12,
    byPlan,
    activeSubscriptions: activeStripeSubs[0]?.count ?? 0,
    recentPayments,
  };
});

// ─── Admin: atualizar plano de uma organização ────────────────────────────────

type PlanSlug = "free" | "pro" | "comercial";
type UpdateOrgPlanInput = { organizationId: string; planSlug: PlanSlug };

const _updateOrgPlan = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const session = await requireSession();
  if ((session.user as any).role !== "admin") throw new Error("Sem permissão");

  const { organizationId, planSlug } = ctx.data as unknown as UpdateOrgPlanInput;

  const [plan] = await db
    .select({ id: plans.id, priceMonthly: plans.priceMonthly })
    .from(plans)
    .where(eq(plans.slug, planSlug))
    .limit(1);

  if (!plan) throw new Error(`Plano "${planSlug}" não encontrado`);

  const newStatus = planSlug === "free" ? "free" : plan.priceMonthly === 0 ? "free" : "active";

  const [updated] = await db
    .update(organizations)
    .set({
      planId: plan.id,
      subscriptionStatus: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();

  if (!updated) throw new Error("Organização não encontrada");

  return updated;
});

export const updateOrgPlan = _updateOrgPlan as unknown as (opts: {
  data: UpdateOrgPlanInput;
}) => ReturnType<typeof _updateOrgPlan>;
