import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { db } from "../src/db";
import {
  activities,
  appointments,
  chatMessages,
  leads,
  meuLinkConfigs,
  organizations,
  payments,
  plans,
  properties,
  subscriptions,
  user,
} from "../src/db/schema";

export const NOW = new Date();

export type TestPlanSlug = "free" | "pro" | "comercial_ia";

export type TestAccount = {
  userId: string;
  orgId: string;
  planId: string;
  slug: string;
  email: string;
  planSlug: TestPlanSlug;
};

export function id(prefix: string, label: string) {
  return `${prefix}_${label}_${crypto.randomUUID()}`;
}

export function pass(label: string, details = "") {
  console.log(`[PASS] ${label}${details ? ` - ${details}` : ""}`);
}

export function fail(label: string, details = "") {
  console.log(`[FAIL] ${label}${details ? ` - ${details}` : ""}`);
}

export async function check(label: string, fn: () => void | Promise<void>, failures: { count: number }) {
  try {
    await fn();
    pass(label);
  } catch (error) {
    failures.count += 1;
    fail(label, error instanceof Error ? error.message : String(error));
  }
}

export function assertMasked(lead: any) {
  assert.equal(lead.phone ?? "", "");
  assert.equal(lead.email ?? "", "");
  assert.equal(lead.notes ?? null, null);
  assert.equal(lead.quizAnswers ?? null, null);
}

export function planSeed(slug: TestPlanSlug) {
  if (slug === "free") {
    return {
      slug,
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
      slug,
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
      hasPrioritySupport: true,
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

export async function ensurePlans() {
  const result: Record<TestPlanSlug, string> = {} as Record<TestPlanSlug, string>;
  for (const slug of ["free", "pro", "comercial_ia"] as const) {
    const seed = planSeed(slug);
    const [row] = await db
      .insert(plans)
      .values(seed)
      .onConflictDoUpdate({ target: plans.slug, set: { ...seed, updatedAt: NOW } })
      .returning({ id: plans.id });
    result[slug] = row.id;
  }
  return result;
}

export async function cleanupPrefix(prefix: string) {
  if (!prefix.startsWith("TEST_")) throw new Error(`Prefixo inseguro: ${prefix}`);

  const userRows = await db
    .select({ id: user.id, organizationId: user.organizationId })
    .from(user)
    .where(like(user.id, `${prefix}%`));
  const userIds = userRows.map((row) => row.id);
  const orgIds = userRows.map((row) => row.organizationId).filter(Boolean) as string[];
  const orgRows = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(like(organizations.id, `${prefix}%`));
  for (const row of orgRows) {
    if (!orgIds.includes(row.id)) orgIds.push(row.id);
  }

  const leadRows = userIds.length
    ? await db.select({ id: leads.id }).from(leads).where(inArray(leads.brokerId, userIds))
    : [];
  const leadIds = leadRows.map((row) => row.id);

  if (leadIds.length) {
    await db.delete(chatMessages).where(inArray(chatMessages.leadId, leadIds));
    await db.delete(activities).where(inArray(activities.leadId, leadIds));
  }
  if (userIds.length) {
    await db.delete(appointments).where(inArray(appointments.brokerId, userIds));
    await db.delete(leads).where(inArray(leads.brokerId, userIds));
    await db.delete(properties).where(inArray(properties.brokerId, userIds));
    await db.delete(meuLinkConfigs).where(inArray(meuLinkConfigs.userId, userIds));
    await db.delete(user).where(inArray(user.id, userIds));
  }
  if (orgIds.length) {
    await db.delete(payments).where(inArray(payments.organizationId, orgIds));
    await db.delete(subscriptions).where(inArray(subscriptions.organizationId, orgIds));
    await db.delete(organizations).where(inArray(organizations.id, orgIds));
  }

  await db.execute(sql`delete from meu_link_configs where slug like ${`${prefix.toLowerCase()}%`}`);
}

export async function createAccount(
  prefix: string,
  label: string,
  planSlug: TestPlanSlug,
  options: { role?: string; blocked?: boolean; withOrg?: boolean } = {},
): Promise<TestAccount> {
  const planIds = await ensurePlans();
  const userId = id(prefix, `USER_${label}`);
  const orgId = id(prefix, `ORG_${label}`);
  const slug = `${prefix.toLowerCase().replaceAll("_", "-")}-${label.toLowerCase()}`;
  const email = `${prefix.toLowerCase()}-${label.toLowerCase()}@leadlink.test`;
  const withOrg = options.withOrg ?? true;

  if (withOrg) {
    await db.insert(organizations).values({
      id: orgId,
      name: `${prefix} Org ${label}`,
      planId: planIds[planSlug],
      stripeCustomerId: planSlug === "free" ? null : `cus_${prefix}_${label}`,
      subscriptionStatus: planSlug === "free" ? "free" : "active",
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  await db.insert(user).values({
    id: userId,
    name: `${prefix} User ${label}`,
    email,
    emailVerified: true,
    role: options.role ?? "corretor",
    initials: label.slice(0, 2).toUpperCase(),
    organizationId: withOrg ? orgId : null,
    slug,
    publicName: `${prefix} Public ${label}`,
    whatsapp: "11999990000",
    mainCity: "Sao Paulo",
    regionOfOperation: "Sao Paulo",
    atuacao: "todos",
    displayName: `${prefix} User ${label}`,
    planSlug,
    planStatus: planSlug === "free" ? "free" : "active",
    planAcquiredAt: planSlug === "free" ? null : NOW,
    isBlocked: options.blocked ?? false,
    onboardingCompleted: true,
    profileCompleteness: 100,
    profileCompleted: true,
    createdAt: NOW,
    updatedAt: NOW,
  });

  return { userId, orgId: withOrg ? orgId : "", planId: planIds[planSlug], slug, email, planSlug };
}

export async function createMeuLink(account: TestAccount, data: Record<string, unknown> = {}) {
  await db.insert(meuLinkConfigs).values({
    slug: account.slug,
    userId: account.userId,
    data: {
      slug: account.slug,
      name: `Public ${account.slug}`,
      whatsapp: "11999990000",
      links: [],
      videos: [],
      featuredIds: [],
      ...data,
    },
    createdAt: NOW,
    updatedAt: NOW,
  });
}

export async function createProperty(account: TestAccount, index: number, overrides: Record<string, unknown> = {}) {
  const [row] = await db
    .insert(properties)
    .values({
      id: id(account.userId.split("_USER_")[0] ?? "TEST_PROPERTY", `PROP_${index}`),
      code: `${account.userId}-PROP-${index}`,
      title: `${account.userId} Property ${index}`,
      type: "Apartamento",
      businessType: "Venda",
      status: "Disponível",
      price: 500000 + index * 10000,
      area: 70,
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      neighborhood: "Centro",
      city: "Sao Paulo",
      brokerId: account.userId,
      image: "",
      images: [],
      highlight: "",
      description: "Teste",
      features: {},
      createdAt: new Date(Date.now() - index * 1000),
      ...overrides,
    } as any)
    .returning();
  return row;
}

export async function createLead(account: TestAccount, index: number, overrides: Record<string, unknown> = {}) {
  const [row] = await db
    .insert(leads)
    .values({
      id: id(account.userId.split("_USER_")[0] ?? "TEST_LEAD", `LEAD_${index}`),
      name: `${account.userId} Lead ${index}`,
      phone: `1199999${String(index).padStart(4, "0")}`,
      email: `lead-${index}@leadlink.test`,
      intentType: "compra",
      quizAnswers: { budget: "500k", index },
      source: "Site",
      status: "novo",
      score: 60,
      classification: "morno",
      urgency: "exploratorio",
      budgetRange: "500k",
      scoreDetail: { criteria: [] },
      nextStep: "Ligar",
      profileSummary: "Resumo",
      interest: "Apartamento",
      budget: "500k",
      region: "Centro",
      timeline: "30 dias",
      brokerId: account.userId,
      notes: `Notas sensiveis ${index}`,
      createdAt: new Date(Date.now() - index * 1000),
      lastContact: NOW,
      ...overrides,
    } as any)
    .returning();
  return row;
}

export function maskLeadForPlan(lead: any, planSlug: TestPlanSlug, index: number) {
  if (planSlug !== "free" || index < 15) return { ...lead, isBlocked: false };
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

