import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, asc, count, desc, eq, gte, ilike, or, type SQL, sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { leads, organizations, properties, subscriptions, user, plans } from "@/db/schema";
import { getPlanCapabilities, getUserPlan } from "@/lib/plans";

async function requireAdminSession() {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new Error("Não autenticado");
  if (session.user.role !== "admin") throw new Error("Sem permissão");
  return session;
}

function planFilter(slug?: string) {
  if (!slug || slug === "all") return undefined;
  return eq(user.planSlug, slug);
}

function statusFilter(status?: string) {
  if (!status || status === "all") return undefined;
  return eq(user.planStatus, status);
}

function searchFilter(query?: string) {
  const q = query?.trim();
  if (!q) return undefined;
  const like = `%${q}%`;
  return or(
    ilike(user.name, like),
    ilike(user.email, like),
    ilike(user.slug, like),
    ilike(user.displayName, like),
  );
}

function combineFilters(filters: Array<SQL<unknown> | undefined>) {
  const valid = filters.filter(Boolean) as SQL<unknown>[];
  if (valid.length === 0) return undefined;
  return valid.reduce((acc, curr) => and(acc, curr));
}

export type AdminUserListFilters = {
  plan?: string;
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export const getAdminUsers = createServerFn({ method: "GET" }).handler(async (ctx) => {
  await requireAdminSession();
  const input = (ctx.data as AdminUserListFilters | undefined) ?? {};
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 50));
  const where = combineFilters([
    planFilter(input.plan),
    statusFilter(input.status),
    searchFilter(input.q),
  ]);

  const totalRow = await db.select({ count: count() }).from(user).where(where);

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      slug: user.slug,
      planSlug: user.planSlug,
      planStatus: user.planStatus,
      planAcquiredAt: user.planAcquiredAt,
      planExpiresAt: user.planExpiresAt,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isBlocked: user.isBlocked,
      blockedReason: user.blockedReason,
      lastLoginAt: user.updatedAt,
      organizationId: user.organizationId,
    })
    .from(user)
    .where(where)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const resolved = await Promise.all(
    rows.map(async (row) => {
      const [leadCount] = await db
        .select({ count: count() })
        .from(leads)
        .where(eq(leads.brokerId, row.id));
      const [propertyCount] = await db
        .select({ count: count() })
        .from(properties)
        .where(eq(properties.brokerId, row.id));
      const [org] = row.organizationId
        ? await db
            .select({
              id: organizations.id,
              name: organizations.name,
              stripeCustomerId: organizations.stripeCustomerId,
              subscriptionStatus: organizations.subscriptionStatus,
              planId: organizations.planId,
              planSlug: plans.slug,
            })
            .from(organizations)
            .leftJoin(plans, eq(organizations.planId, plans.id))
            .where(eq(organizations.id, row.organizationId))
            .limit(1)
        : [];
      const plan = getUserPlan({
        ...row,
        organizationPlanSlug: org?.planSlug ?? null,
        organizationSubscriptionStatus: org?.subscriptionStatus ?? null,
      });
      const capabilities = getPlanCapabilities(org?.planSlug ?? row.planSlug);
      return {
        ...row,
        organization: org ?? null,
        planLabel: plan.planSlug,
        planStatus: row.planStatus,
        capabilities,
        leadsLimit: capabilities.leadsLimit,
        propertiesLimit: capabilities.propertiesLimit,
        leadsUsed: leadCount?.count ?? 0,
        propertiesUsed: propertyCount?.count ?? 0,
      };
    }),
  );

  return {
    items: resolved,
    total: totalRow[0]?.count ?? 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((totalRow[0]?.count ?? 0) / pageSize)),
  };
});

export const getAdminUserDetail = createServerFn({ method: "GET" }).handler(async (ctx) => {
  await requireAdminSession();
  const userId =
    typeof ctx.data === "string" ? ctx.data : (ctx.data as { userId?: string } | undefined)?.userId;
  if (!userId) throw new Error("Usuário inválido");

  const [row] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!row) throw new Error("Usuário não encontrado");

  const [org] = row.organizationId
    ? await db.select().from(organizations).where(eq(organizations.id, row.organizationId)).limit(1)
    : [];
  const [sub] = row.organizationId
    ? await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, row.organizationId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1)
    : [];
  const leadsCount = await db
    .select({ count: count() })
    .from(leads)
    .where(eq(leads.brokerId, row.id));
  const propertiesCount = await db
    .select({ count: count() })
    .from(properties)
    .where(eq(properties.brokerId, row.id));
  const [orgPlan] = row.organizationId
    ? await db
        .select({ planSlug: plans.slug, subscriptionStatus: organizations.subscriptionStatus })
        .from(organizations)
        .leftJoin(plans, eq(organizations.planId, plans.id))
        .where(eq(organizations.id, row.organizationId))
        .limit(1)
    : [];
  const plan = getUserPlan({
    ...row,
    organizationPlanSlug: orgPlan?.planSlug ?? null,
    organizationSubscriptionStatus: orgPlan?.subscriptionStatus ?? null,
  });
  const capabilities = getPlanCapabilities(orgPlan?.planSlug ?? row.planSlug);

  return {
    user: row,
    organization: org ?? null,
    subscription: sub ?? null,
    usage: {
      leadsCount: leadsCount[0]?.count ?? 0,
      propertiesCount: propertiesCount[0]?.count ?? 0,
    },
    plan,
    capabilities,
  };
});

export const getAdminPlatformMetrics = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  const [usersTotal] = await db.select({ count: count() }).from(user);
  const [freeUsers] = await db
    .select({ count: count() })
    .from(user)
    .where(eq(user.planSlug, "free"));
  const [proUsers] = await db.select({ count: count() }).from(user).where(eq(user.planSlug, "pro"));
  const [iaUsers] = await db
    .select({ count: count() })
    .from(user)
    .where(eq(user.planSlug, "comercial_ia"));
  const [pastDueUsers] = await db
    .select({ count: count() })
    .from(user)
    .where(eq(user.planStatus, "past_due"));
  const [canceledUsers] = await db
    .select({ count: count() })
    .from(user)
    .where(eq(user.planStatus, "canceled"));
  const [blockedUsers] = await db
    .select({ count: count() })
    .from(user)
    .where(eq(user.isBlocked, true));
  const [newUsers30d] = await db
    .select({ count: count() })
    .from(user)
    .where(gte(user.createdAt, new Date(Date.now() - 30 * 86400000)));
  const [leads30d] = await db
    .select({ count: count() })
    .from(leads)
    .where(gte(leads.createdAt, new Date(Date.now() - 30 * 86400000)));
  const [propertiesTotal] = await db.select({ count: count() }).from(properties);
  const paidUsers = await db
    .select({ planSlug: user.planSlug })
    .from(user)
    .where(inArray(user.planSlug, ["pro", "comercial_ia"]));
  const mrr = paidUsers.reduce((sum, item) => sum + (item.planSlug === "pro" ? 9700 : 129000), 0);

  return {
    totalUsers: usersTotal[0]?.count ?? 0,
    freeUsers: freeUsers[0]?.count ?? 0,
    proUsers: proUsers[0]?.count ?? 0,
    comercialIaUsers: iaUsers[0]?.count ?? 0,
    mrrCents: mrr,
    newUsers30d: newUsers30d[0]?.count ?? 0,
    leads30d: leads30d[0]?.count ?? 0,
    propertiesTotal: propertiesTotal[0]?.count ?? 0,
    pastDueUsers: pastDueUsers[0]?.count ?? 0,
    canceledUsers: canceledUsers[0]?.count ?? 0,
    blockedUsers: blockedUsers[0]?.count ?? 0,
  };
});

async function touchUserPlan(
  userId: string,
  planSlug: "free" | "pro" | "comercial_ia" | "comercial",
) {
  const normalized = planSlug === "comercial" ? "comercial_ia" : planSlug;
  await db
    .update(user)
    .set({
      planSlug: normalized,
      planStatus: normalized === "free" ? "free" : "active",
      planAcquiredAt: normalized === "free" ? null : new Date(),
      planExpiresAt: normalized === "free" ? null : new Date(Date.now() + 30 * 86400000),
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
}

export const blockUser = createServerFn({ method: "POST" }).handler(async (ctx) => {
  await requireAdminSession();
  const { userId, reason } = ctx.data as { userId: string; reason?: string };
  await db
    .update(user)
    .set({
      isBlocked: true,
      blockedReason: reason?.trim() || "Bloqueado pelo administrador",
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
  return { ok: true };
});

export const unblockUser = createServerFn({ method: "POST" }).handler(async (ctx) => {
  await requireAdminSession();
  const { userId } = ctx.data as { userId: string };
  await db
    .update(user)
    .set({
      isBlocked: false,
      blockedReason: null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
  return { ok: true };
});

export const adminOverridePlan = createServerFn({ method: "POST" }).handler(async (ctx) => {
  await requireAdminSession();
  const { userId, planSlug } = ctx.data as {
    userId: string;
    planSlug: "free" | "pro" | "comercial_ia" | "comercial";
  };
  await touchUserPlan(userId, planSlug);
  return { ok: true };
});

export const cancelUserSubscription = createServerFn({ method: "POST" }).handler(async (ctx) => {
  await requireAdminSession();
  const { userId } = ctx.data as { userId: string };
  const [row] = await db
    .select({
      organizationId: user.organizationId,
      stripeSubscriptionId: user.stripeSubscriptionId,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (row?.stripeSubscriptionId) {
    await db
      .update(subscriptions)
      .set({
        status: "canceled",
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, row.stripeSubscriptionId));
    await db
      .update(user)
      .set({ planStatus: "canceled", updatedAt: new Date() })
      .where(eq(user.id, userId));
  } else {
    await db
      .update(user)
      .set({ planStatus: "canceled", updatedAt: new Date() })
      .where(eq(user.id, userId));
  }
  return { ok: true };
});
