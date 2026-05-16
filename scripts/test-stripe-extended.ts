import "dotenv/config";
import assert from "node:assert/strict";
import { count, eq } from "drizzle-orm";
import { db } from "../src/db";
import { organizations, payments, subscriptions, user } from "../src/db/schema";
import { __testDispatchStripeEvent } from "../src/routes/api/stripe/-webhook-handler";
import { check, cleanupPrefix, createAccount } from "./test-critical-utils";

const PREFIX = "TEST_STRIPE_EXTENDED";
const failures = { count: 0 };
const now = Date.now();

function fakeSub(ctx: { orgId: string; customerId: string; subscriptionId: string }, status: string, customer?: string | null) {
  const periodEnd = Math.floor((now + 30 * 86400_000) / 1000);
  return {
    id: ctx.subscriptionId,
    customer: customer === undefined ? ctx.customerId : customer,
    status,
    cancel_at_period_end: false,
    canceled_at: status === "canceled" ? Math.floor(now / 1000) : null,
    trial_end: null,
    current_period_end: periodEnd,
    items: {
      data: [
        {
          price: { id: process.env.STRIPE_PRO_PRICE_ID || "" },
          current_period_start: Math.floor((now - 60_000) / 1000),
          current_period_end: periodEnd,
        },
      ],
    },
    metadata: { organizationId: ctx.orgId },
  } as any;
}

async function main() {
  await cleanupPrefix(PREFIX);
  try {
    const account = await createAccount(PREFIX, "PRO", "pro");
    const customerId = `cus_${PREFIX}`;
    const subscriptionId = `sub_${PREFIX}`;
    await db
      .update(organizations)
      .set({ stripeCustomerId: customerId, subscriptionStatus: "active" })
      .where(eq(organizations.id, account.orgId));
    await db
      .update(user)
      .set({ stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, planSlug: "pro", planStatus: "active" })
      .where(eq(user.id, account.userId));

    await check("customer.subscription.updated active mantém plano pago", async () => {
      await __testDispatchStripeEvent({
        type: "customer.subscription.updated",
        data: { object: fakeSub({ orgId: account.orgId, customerId, subscriptionId }, "active") },
      });
      const [u] = await db.select().from(user).where(eq(user.id, account.userId)).limit(1);
      const [org] = await db.select().from(organizations).where(eq(organizations.id, account.orgId)).limit(1);
      assert.equal(u?.planSlug, "pro");
      assert.equal(u?.planStatus, "active");
      assert.equal(org?.subscriptionStatus, "active");
    }, failures);

    await check("customer.subscription.updated past_due marca past_due", async () => {
      await __testDispatchStripeEvent({
        type: "customer.subscription.updated",
        data: { object: fakeSub({ orgId: account.orgId, customerId, subscriptionId }, "past_due") },
      });
      const [u] = await db.select().from(user).where(eq(user.id, account.userId)).limit(1);
      const [org] = await db.select().from(organizations).where(eq(organizations.id, account.orgId)).limit(1);
      assert.equal(u?.planSlug, "pro");
      assert.equal(u?.planStatus, "past_due");
      assert.equal(org?.subscriptionStatus, "past_due");
    }, failures);

    await check("customer.subscription.updated canceled volta para Free", async () => {
      await __testDispatchStripeEvent({
        type: "customer.subscription.updated",
        data: { object: fakeSub({ orgId: account.orgId, customerId, subscriptionId }, "canceled") },
      });
      const [org] = await db.select().from(organizations).where(eq(organizations.id, account.orgId)).limit(1);
      const [u] = await db.select().from(user).where(eq(user.id, account.userId)).limit(1);
      assert.equal(org?.subscriptionStatus, "free");
      assert.equal(u?.planSlug, "free");
      assert.equal(u?.planStatus, "canceled");
    }, failures);

    await check("customer.subscription.deleted sem stripeCustomerId mas com metadata.organizationId processa corretamente", async () => {
      await db.update(organizations).set({ stripeCustomerId: null }).where(eq(organizations.id, account.orgId));
      await __testDispatchStripeEvent({
        type: "customer.subscription.deleted",
        data: { object: fakeSub({ orgId: account.orgId, customerId, subscriptionId }, "canceled", null) },
      });
      const [org] = await db.select().from(organizations).where(eq(organizations.id, account.orgId)).limit(1);
      assert.equal(org?.subscriptionStatus, "free");
    }, failures);

    await check("invoice.payment_succeeded duplicado não duplica payment", async () => {
      await db.update(organizations).set({ stripeCustomerId: customerId }).where(eq(organizations.id, account.orgId));
      const invoice = {
        customer: customerId,
        amount_paid: 9700,
        currency: "brl",
        payment_intent: `pi_${PREFIX}`,
        payment_method_details: { card: { last4: "4242", brand: "visa" } },
        status_transitions: { paid_at: Math.floor(now / 1000) },
        parent: { subscription_details: { subscription: subscriptionId } },
        lines: { data: [{ period: { end: Math.floor((now + 30 * 86400_000) / 1000) } }] },
      };
      await __testDispatchStripeEvent({ type: "invoice.payment_succeeded", data: { object: invoice } });
      await __testDispatchStripeEvent({ type: "invoice.payment_succeeded", data: { object: invoice } });
      const [row] = await db
        .select({ count: count() })
        .from(payments)
        .where(eq(payments.stripePaymentIntentId, `pi_${PREFIX}`));
      assert.equal(row?.count, 1);
    }, failures);

    await check("subscription upsert permanece único", async () => {
      const [row] = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
      assert.equal(row?.count, 1);
    }, failures);
  } finally {
    await cleanupPrefix(PREFIX);
  }

  if (failures.count) {
    console.error(`\n${PREFIX}: FAIL (${failures.count})`);
    process.exitCode = 1;
  } else {
    console.log(`\n${PREFIX}: PASS`);
  }
}

await main();
