import "dotenv/config";
import { db } from "@/db";
import { organizations, plans, subscriptions, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { __testDispatchStripeEvent } from "@/routes/api/stripe/-webhook-handler";

type TestContext = {
  userId: string;
  orgId: string;
  planId: string;
  proPlanId: string;
  customerId: string;
  subscriptionId: string;
};

const PREFIX = "TEST_STRIPE";
const now = Date.now();

function pass(step: string) {
  console.log(`PASS ${step}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function cleanup(ctx?: TestContext) {
  if (ctx) {
    await db.execute(sql`delete from "payments" where organization_id = ${ctx.orgId}`);
    await db.execute(sql`delete from "subscriptions" where organization_id = ${ctx.orgId}`);
    await db.execute(
      sql`delete from "user" where organization_id = ${ctx.orgId} or id = ${ctx.userId}`,
    );
    await db.execute(sql`delete from "organizations" where id = ${ctx.orgId}`);
  }
}

async function ensureTestColumns() {
  await db.execute(sql`
    alter table "user" add column if not exists plan_slug text default 'free';
  `);
  await db.execute(sql`
    alter table "user" add column if not exists plan_status text default 'free';
  `);
  await db.execute(sql`
    alter table "user" add column if not exists stripe_customer_id text;
  `);
  await db.execute(sql`
    alter table "user" add column if not exists stripe_subscription_id text;
  `);
  await db.execute(sql`
    alter table "user" add column if not exists plan_acquired_at timestamp;
  `);
  await db.execute(sql`
    alter table "user" add column if not exists plan_expires_at timestamp;
  `);
  await db.execute(sql`
    alter table "user" add column if not exists payment_method_last4 text;
  `);
  await db.execute(sql`
    alter table "user" add column if not exists payment_method_brand text;
  `);
}

async function getPlanIdBySlug(slug: string) {
  const [row] = await db.select({ id: plans.id }).from(plans).where(eq(plans.slug, slug)).limit(1);
  if (!row?.id) throw new Error(`Plano não encontrado: ${slug}`);
  return row.id;
}

async function ensurePlanRow(slug: "free" | "pro" | "comercial_ia") {
  const [row] = await db.select({ id: plans.id }).from(plans).where(eq(plans.slug, slug)).limit(1);
  if (row?.id) return row.id;
  const [inserted] = await db
    .insert(plans)
    .values({
      name: slug === "free" ? "Free" : slug === "pro" ? "Pro" : "Comercial IA",
      slug,
      description:
        slug === "free"
          ? "Plano gratuito"
          : slug === "pro"
            ? "Plano profissional"
            : "Plano comercial com IA",
      priceMonthly: slug === "free" ? 0 : slug === "pro" ? 9700 : 129000,
      setupFee: slug === "comercial_ia" ? 490000 : 0,
      maxUsers: slug === "free" ? 1 : slug === "pro" ? 1 : 15,
      maxProperties: slug === "free" ? 3 : slug === "pro" ? 50 : 500,
      maxLeadsPerMonth: slug === "free" ? 15 : slug === "pro" ? 500 : 5000,
      maxCustomForms: slug === "free" ? 0 : slug === "pro" ? 3 : 20,
      hasCrm: slug !== "free",
      hasAdvancedDashboard: slug === "comercial_ia",
      hasCustomBranding: slug !== "free",
      hasTeamManagement: slug === "comercial_ia",
      hasLeadDistribution: slug === "comercial_ia",
      hasPrioritySupport: slug !== "free",
      showLeadlinkBranding: slug === "free",
      isActive: true,
      updatedAt: new Date(),
    })
    .returning({ id: plans.id });
  if (!inserted?.id) throw new Error(`Falha ao criar plano de teste: ${slug}`);
  return inserted.id;
}

async function ensureTestContext(): Promise<TestContext> {
  await ensureTestColumns();
  const proPlanId = await ensurePlanRow("pro");
  const freePlanId = await ensurePlanRow("free");
  const userId = `${PREFIX}_${crypto.randomUUID()}`;
  const orgId = `${PREFIX}_ORG_${crypto.randomUUID()}`;
  const customerId = `cus_${PREFIX.toLowerCase()}_${crypto.randomUUID().replace(/-/g, "")}`;
  const subscriptionId = `sub_${PREFIX.toLowerCase()}_${crypto.randomUUID().replace(/-/g, "")}`;

  await db.insert(organizations).values({
    id: orgId,
    name: `${PREFIX} Org`,
    planId: freePlanId,
    stripeCustomerId: customerId,
    subscriptionStatus: "free",
    updatedAt: new Date(),
  });

  await db.execute(sql`
    insert into "user" (
      id,
      name,
      email,
      email_verified,
      updated_at,
      role,
      organization_id,
      plan_slug,
      plan_status
    ) values (
      ${userId},
      ${PREFIX},
      ${`${PREFIX.toLowerCase()}_${Date.now()}@example.com`},
      true,
      ${new Date().toISOString()},
      'corretor',
      ${orgId},
      'free',
      'free'
    )
  `);

  return { userId, orgId, planId: freePlanId, proPlanId, customerId, subscriptionId };
}

function fakeSubscription(ctx: TestContext) {
  const periodEnd = Math.floor((now + 30 * 24 * 60 * 60 * 1000) / 1000);
  return {
    id: ctx.subscriptionId,
    customer: ctx.customerId,
    status: "active",
    cancel_at_period_end: false,
    canceled_at: null,
    trial_end: null,
    current_period_end: periodEnd,
    items: {
      data: [
        {
          price: { id: process.env.STRIPE_PRO_PRICE_ID ?? "price_test_pro" },
          current_period_start: Math.floor((now - 60_000) / 1000),
          current_period_end: periodEnd,
        },
      ],
    },
    metadata: { organizationId: ctx.orgId },
  } as {
    id: string;
    customer: string;
    status: string;
    cancel_at_period_end: boolean;
    canceled_at: number | null;
    trial_end: number | null;
    current_period_end: number;
    items: {
      data: Array<{
        price: { id: string };
        current_period_start: number;
        current_period_end: number;
      }>;
    };
    metadata: { organizationId: string };
  };
}

async function getState(ctx: TestContext) {
  const [u] = await db.execute(sql`
    select
      id,
      organization_id as "organizationId",
      plan_slug as "planSlug",
      plan_status as "planStatus",
      stripe_customer_id as "stripeCustomerId",
      stripe_subscription_id as "stripeSubscriptionId",
      plan_acquired_at as "planAcquiredAt",
      plan_expires_at as "planExpiresAt",
      payment_method_last4 as "paymentMethodLast4",
      payment_method_brand as "paymentMethodBrand"
    from "user"
    where id = ${ctx.userId}
    limit 1
  `);
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId))
    .limit(1);
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, ctx.subscriptionId))
    .limit(1);
  return { u, org, sub };
}

async function stepCheckout(ctx: TestContext) {
  await __testDispatchStripeEvent({
    type: "checkout.session.completed",
    data: {
      object: {
        metadata: { organizationId: ctx.orgId, planSlug: "pro" },
        customer: ctx.customerId,
        subscription: ctx.subscriptionId,
        __testSubscription: fakeSubscription(ctx),
      },
    },
  });

  const { u, org, sub } = await getState(ctx);
  assert(u?.planSlug === "pro", "user.planSlug não virou pro");
  assert(u?.planStatus === "active", "user.planStatus não virou active");
  assert(Boolean(u?.stripeCustomerId), "user.stripeCustomerId vazio");
  assert(Boolean(u?.stripeSubscriptionId), "user.stripeSubscriptionId vazio");
  assert(org?.planId, "organization.planId vazio");
  assert(sub?.stripeSubscriptionId === ctx.subscriptionId, "subscription não foi sincronizada");
  pass("checkout.session.completed");
}

async function stepInvoicePaid(ctx: TestContext) {
  await __testDispatchStripeEvent({
    type: "invoice.payment_succeeded",
    data: {
      object: {
        customer: ctx.customerId,
        amount_paid: 9700,
        currency: "brl",
        payment_intent: `pi_${ctx.subscriptionId}_paid`,
        payment_method_details: { card: { last4: "4242", brand: "visa" } },
        status_transitions: { paid_at: Math.floor((now + 1000) / 1000) },
        lines: { data: [{ period: { end: Math.floor((now + 30 * 24 * 60 * 60 * 1000) / 1000) } }] },
        parent: { subscription_details: { subscription: ctx.subscriptionId } },
      },
    },
  });

  const { u } = await getState(ctx);
  assert(Boolean(u?.planExpiresAt), "planExpiresAt não atualizou");
  assert(u?.paymentMethodLast4 === "4242", "paymentMethodLast4 incorreto");
  assert(u?.paymentMethodBrand === "visa", "paymentMethodBrand incorreto");
  pass("invoice.payment_succeeded");
}

async function stepInvoiceFailed(ctx: TestContext) {
  await __testDispatchStripeEvent({
    type: "invoice.payment_failed",
    data: {
      object: {
        customer: ctx.customerId,
        amount_due: 9700,
        currency: "brl",
        payment_intent: `pi_${ctx.subscriptionId}_failed`,
        parent: { subscription_details: { subscription: ctx.subscriptionId } },
      },
    },
  });

  const { u } = await getState(ctx);
  assert(u?.planStatus === "past_due", "user.planStatus não virou past_due");
  pass("invoice.payment_failed");
}

async function stepSubscriptionDeleted(ctx: TestContext) {
  await __testDispatchStripeEvent({
    type: "customer.subscription.deleted",
    data: {
      object: {
        id: ctx.subscriptionId,
        customer: ctx.customerId,
        status: "canceled",
        cancel_at_period_end: false,
        canceled_at: Math.floor(now / 1000),
        current_period_end: Math.floor((now + 30 * 24 * 60 * 60 * 1000) / 1000),
        metadata: { organizationId: ctx.orgId },
      },
    },
  });

  const { u, org } = await getState(ctx);
  assert(u?.planStatus === "canceled", "user.planStatus não virou canceled");
  assert(org?.subscriptionStatus === "free", "organization não voltou para free");
  pass("customer.subscription.deleted");
}

async function main() {
  const ctx = await ensureTestContext();
  const results: Array<{ step: string; ok: boolean; message?: string }> = [];
  try {
    for (const [step, fn] of [
      ["checkout.session.completed", stepCheckout],
      ["invoice.payment_succeeded", stepInvoicePaid],
      ["invoice.payment_failed", stepInvoiceFailed],
      ["customer.subscription.deleted", stepSubscriptionDeleted],
    ] as const) {
      try {
        await fn(ctx);
        results.push({ step, ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`FAIL ${step}: ${message}`);
        results.push({ step, ok: false, message });
      }
    }

    const failed = results.filter((result) => !result.ok);
    if (failed.length === 0) {
      console.log("RESUMO PASS: harness Stripe concluído com sucesso");
    } else {
      console.log(`RESUMO FAIL: ${failed.length} etapa(s) falharam`);
      process.exitCode = 1;
    }
  } finally {
    await cleanup(ctx);
  }
}

await main();
