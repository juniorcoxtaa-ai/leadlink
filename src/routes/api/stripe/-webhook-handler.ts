import { db } from "@/db";
import { organizations, subscriptions, payments, plans, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import {
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRO_PRICE_ID,
  STRIPE_COMERCIAL_PRICE_ID,
} from "@/config.server";
import type Stripe from "stripe";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priceToSlug(priceId: string): "pro" | "comercial" | null {
  if (priceId === STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === STRIPE_COMERCIAL_PRICE_ID) return "comercial";
  return null;
}

function stripeSlugToUserPlanSlug(
  slug: "pro" | "comercial" | null,
): "free" | "pro" | "comercial_ia" {
  if (slug === "pro") return "pro";
  if (slug === "comercial") return "comercial_ia";
  return "free";
}

async function updateUserPlanFields(
  orgId: string,
  values: Partial<
    Pick<
      typeof user.$inferSelect,
      | "stripeCustomerId"
      | "stripeSubscriptionId"
      | "planSlug"
      | "planAcquiredAt"
      | "planExpiresAt"
      | "planStatus"
      | "paymentMethodLast4"
      | "paymentMethodBrand"
    >
  >,
) {
  await db
    .update(user)
    .set({
      ...values,
      updatedAt: new Date(),
    })
    .where(eq(user.organizationId, orgId));
}

async function getPlanIdBySlug(slug: string): Promise<string | null> {
  const [p] = await db.select({ id: plans.id }).from(plans).where(eq(plans.slug, slug)).limit(1);
  return p?.id ?? null;
}

async function getFreePlanId(): Promise<string | null> {
  return getPlanIdBySlug("free");
}

// Bug fix #7: handle both string and expanded Stripe Customer object
function extractCustomerId(
  customer: Stripe.Subscription["customer"] | Stripe.Checkout.Session["customer"],
): string | null {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  return (customer as any).id ?? null;
}

async function getOrgByStripeCustomer(customerId: string): Promise<string | null> {
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId))
    .limit(1);
  return org?.id ?? null;
}

// Bug fix #3: fall back to subscription metadata.organizationId when stripeCustomerId not yet written
async function resolveOrgId(stripeSub: Stripe.Subscription): Promise<string | null> {
  const customerId = extractCustomerId(stripeSub.customer);
  if (customerId) {
    const orgId = await getOrgByStripeCustomer(customerId);
    if (orgId) return orgId;
  }
  // Fallback: metadata written at checkout session creation
  return (stripeSub as any).metadata?.organizationId ?? null;
}

async function upsertSubscription(
  orgId: string,
  stripeSub: Stripe.Subscription,
  planId: string,
): Promise<void> {
  const sub = stripeSub as any;
  const firstItem = sub.items?.data?.[0];
  const priceId = firstItem?.price?.id ?? null;

  // current_period_start/end moved to subscription items in Stripe SDK v22
  const periodStart = firstItem?.current_period_start ?? sub.current_period_start ?? null;
  const periodEnd = firstItem?.current_period_end ?? sub.current_period_end ?? null;

  const values = {
    organizationId: orgId,
    planId,
    stripeCustomerId: extractCustomerId(stripeSub.customer),
    stripeSubscriptionId: stripeSub.id,
    stripePriceId: priceId,
    status: stripeSub.status,
    currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
    trialEndsAt: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSub.id))
    .limit(1);

  if (existing) {
    await db
      .update(subscriptions)
      .set(values)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSub.id));
  } else {
    // Bug fix #4: UNIQUE constraint on stripe_subscription_id prevents duplicates
    // from concurrent events. ON CONFLICT is handled by the DB constraint; we catch
    // the duplicate key error and treat it as an update.
    try {
      await db.insert(subscriptions).values(values);
    } catch (err: any) {
      // Duplicate key — another concurrent event already inserted; update instead
      if (err?.code === "23505" || err?.message?.includes("unique")) {
        await db
          .update(subscriptions)
          .set(values)
          .where(eq(subscriptions.stripeSubscriptionId, stripeSub.id));
      } else {
        throw err;
      }
    }
  }
}

function stripeStatusToOrgStatus(
  status: Stripe.Subscription.Status,
  cancelAtPeriodEnd: boolean,
): string {
  // Statuses that map to "active" in our system
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due") return "past_due";
  if (status === "unpaid") return "past_due";
  // Terminal statuses — revert to free
  if (status === "canceled") return "free";
  if (status === "incomplete_expired") return "free";
  // Pending first payment — treat as active (subscription exists)
  if (status === "incomplete") return "active";
  return status;
}

// ─── Event handlers ───────────────────────────────────────────────────────────

// Bug fix #1: use actual Stripe subscription status instead of hardcoding "active"
// Bug fix #7: handle expanded customer object
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const orgId = session.metadata?.organizationId;
  const planSlug = session.metadata?.planSlug;
  const customerId = extractCustomerId(session.customer);

  if (!orgId || !planSlug || !customerId) {
    console.error("[stripe/webhook] checkout.session.completed missing required metadata", {
      orgId,
      planSlug,
      customerId,
    });
    return;
  }

  const planId = await getPlanIdBySlug(planSlug);
  if (!planId) {
    console.error("[stripe/webhook] plan not found for slug:", planSlug);
    return;
  }

  // Write stripeCustomerId first so that concurrent subscription.created events
  // can resolve the org. This is intentionally a separate write.
  await db
    .update(organizations)
    .set({ stripeCustomerId: customerId, updatedAt: new Date() })
    .where(eq(organizations.id, orgId));

  const userPlanSlug = stripeSlugToUserPlanSlug(planSlug as "pro" | "comercial");
  await updateUserPlanFields(orgId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId:
      typeof session.subscription === "string"
        ? session.subscription
        : ((session.subscription as any)?.id ?? null),
    planSlug: userPlanSlug,
    planStatus: "active",
    planAcquiredAt: new Date(),
    planExpiresAt: null,
  });

  const testSubscription = (session as any).__testSubscription ?? null;

  if (testSubscription) {
    const stripeSub = testSubscription as Stripe.Subscription;
    await upsertSubscription(orgId, stripeSub, planId);

    await updateUserPlanFields(orgId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSub.id,
      planSlug: stripeSlugToUserPlanSlug(planSlug as "pro" | "comercial"),
      planStatus: stripeSub.status,
      planAcquiredAt: new Date(),
      planExpiresAt: stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000)
        : null,
    });

    await db
      .update(organizations)
      .set({
        planId,
        subscriptionStatus: stripeStatusToOrgStatus(
          stripeSub.status,
          stripeSub.cancel_at_period_end,
        ),
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));
  } else if (session.subscription) {
    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : (session.subscription as any).id;

    const stripeSub = await getStripe().subscriptions.retrieve(subId);
    await upsertSubscription(orgId, stripeSub, planId);

    await updateUserPlanFields(orgId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSub.id,
      planSlug: stripeSlugToUserPlanSlug(planSlug as "pro" | "comercial"),
      planStatus: stripeSub.status,
      planAcquiredAt: new Date(),
      planExpiresAt: stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000)
        : null,
    });

    // Bug fix #1: use actual subscription status (could be trialing, incomplete, etc.)
    await db
      .update(organizations)
      .set({
        planId,
        subscriptionStatus: stripeStatusToOrgStatus(
          stripeSub.status,
          stripeSub.cancel_at_period_end,
        ),
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));
  } else {
    // No subscription on session — shouldn't happen for subscription mode but safe fallback
    await db
      .update(organizations)
      .set({ planId, subscriptionStatus: "active", updatedAt: new Date() })
      .where(eq(organizations.id, orgId));
  }
}

// Bug fix #2: reset planId to free when status=canceled
// Bug fix #3: fallback to subscription metadata.organizationId
async function handleSubscriptionUpdated(stripeSub: Stripe.Subscription): Promise<void> {
  const orgId = await resolveOrgId(stripeSub);
  if (!orgId) return;

  // Bug fix #2: canceled subscriptions must reset to free plan — don't just update status
  if (stripeSub.status === "canceled") {
    const freePlanId = await getFreePlanId();
    await db
      .update(organizations)
      .set({ planId: freePlanId, subscriptionStatus: "free", updatedAt: new Date() })
      .where(eq(organizations.id, orgId));
    await db
      .update(subscriptions)
      .set({
        status: "canceled",
        canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, stripeSub.id));
    await updateUserPlanFields(orgId, {
      stripeSubscriptionId: stripeSub.id,
      planSlug: "free",
      planStatus: "canceled",
      planExpiresAt: stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000)
        : null,
    });
    return;
  }

  const priceId = stripeSub.items.data[0]?.price.id ?? null;
  const slug = priceId ? priceToSlug(priceId) : null;
  const planId = slug ? await getPlanIdBySlug(slug) : null;
  const newStatus = stripeStatusToOrgStatus(stripeSub.status, stripeSub.cancel_at_period_end);

  if (planId) {
    // Known price: update plan + status together
    await upsertSubscription(orgId, stripeSub, planId);
    await db
      .update(organizations)
      .set({ planId, subscriptionStatus: newStatus, updatedAt: new Date() })
      .where(eq(organizations.id, orgId));
    await updateUserPlanFields(orgId, {
      stripeSubscriptionId: stripeSub.id,
      planSlug: stripeSlugToUserPlanSlug(slug as "pro" | "comercial"),
      planStatus: newStatus,
      planExpiresAt: stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000)
        : null,
    });
  } else {
    // Unknown price (e.g., manual invoice): sync status only, keep existing planId
    await db
      .update(organizations)
      .set({ subscriptionStatus: newStatus, updatedAt: new Date() })
      .where(eq(organizations.id, orgId));

    const [existingOrg] = await db
      .select({ planId: organizations.planId })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    if (existingOrg?.planId) {
      await upsertSubscription(orgId, stripeSub, existingOrg.planId);
    }
    await updateUserPlanFields(orgId, {
      stripeSubscriptionId: stripeSub.id,
      planStatus: newStatus,
      planExpiresAt: stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000)
        : null,
    });
  }
}

// Bug fix #3: fallback to metadata on deleted too
async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription): Promise<void> {
  const orgId = await resolveOrgId(stripeSub);
  if (!orgId) return;

  const freePlanId = await getFreePlanId();

  await db
    .update(organizations)
    .set({ planId: freePlanId, subscriptionStatus: "free", updatedAt: new Date() })
    .where(eq(organizations.id, orgId));

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSub.id));
  await updateUserPlanFields(orgId, {
    stripeSubscriptionId: stripeSub.id,
    planSlug: "free",
    planStatus: "canceled",
    planExpiresAt: stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000)
      : null,
  });
}

async function handleInvoiceSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const inv = invoice as any;
  const customerId = extractCustomerId(invoice.customer as any) ?? null;
  if (!customerId) return;

  const orgId = await getOrgByStripeCustomer(customerId);
  if (!orgId) return;

  // Stripe v22: payment_intent may be nested; support both legacy and new structure
  const rawPi = inv.payment_intent ?? inv.confirmation_secret?.payment_intent ?? null;
  const paymentIntentId: string | null = typeof rawPi === "string" ? rawPi : (rawPi?.id ?? null);

  // Idempotent: skip if already recorded by paymentIntentId
  if (paymentIntentId) {
    const [existing] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    if (existing) return;
  }

  // Stripe v22: subscription via parent.subscription_details; support legacy field too
  const rawSub = inv.parent?.subscription_details?.subscription ?? inv.subscription ?? null;
  const stripeSubId: string | null = typeof rawSub === "string" ? rawSub : (rawSub?.id ?? null);

  // Bug fix #8: look up DB subscription ID for failed payments too
  let dbSubId: string | null = null;
  if (stripeSubId) {
    const [dbSub] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubId))
      .limit(1);
    dbSubId = dbSub?.id ?? null;
  }

  await db.insert(payments).values({
    organizationId: orgId,
    subscriptionId: dbSubId,
    stripePaymentIntentId: paymentIntentId,
    amountCents: invoice.amount_paid,
    currency: invoice.currency,
    status: "succeeded",
    paidAt: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : new Date(),
  });

  await updateUserPlanFields(orgId, {
    paymentMethodLast4: inv.payment_method_details?.card?.last4 ?? null,
    paymentMethodBrand: inv.payment_method_details?.card?.brand ?? null,
    planExpiresAt: inv.lines?.data?.[0]?.period?.end
      ? new Date(inv.lines.data[0].period.end * 1000)
      : null,
  });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
  const inv = invoice as any;
  const customerId = extractCustomerId(invoice.customer as any) ?? null;
  if (!customerId) return;

  const orgId = await getOrgByStripeCustomer(customerId);
  if (!orgId) return;

  // Mark org as past_due without removing the plan — user gets grace period
  await db
    .update(organizations)
    .set({ subscriptionStatus: "past_due", updatedAt: new Date() })
    .where(eq(organizations.id, orgId));

  const rawPi = inv.payment_intent ?? inv.confirmation_secret?.payment_intent ?? null;
  const paymentIntentId: string | null = typeof rawPi === "string" ? rawPi : (rawPi?.id ?? null);

  // Idempotent: skip duplicate failed payment records
  if (paymentIntentId) {
    const [existing] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    if (existing) return;
  }

  // Bug fix #8: resolve DB subscription ID for the failed payment record
  const rawSub = inv.parent?.subscription_details?.subscription ?? inv.subscription ?? null;
  const stripeSubId: string | null = typeof rawSub === "string" ? rawSub : (rawSub?.id ?? null);
  let dbSubId: string | null = null;
  if (stripeSubId) {
    const [dbSub] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubId))
      .limit(1);
    dbSubId = dbSub?.id ?? null;
  }

  await db.insert(payments).values({
    organizationId: orgId,
    subscriptionId: dbSubId,
    stripePaymentIntentId: paymentIntentId,
    amountCents: invoice.amount_due,
    currency: invoice.currency,
    status: "failed",
    paidAt: null,
  });

  await updateUserPlanFields(orgId, {
    planStatus: "past_due",
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function handleStripeWebhook(request: Request) {
  // Bug fix #13: validate webhook secret before attempting signature verification
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET não configurada");
    return new Response("Webhook não configurado", { status: 503 });
  }

  // Raw body must be read BEFORE any parsing — Stripe signature covers exact bytes
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("[stripe/webhook] signature verification failed:", err.message);
    return new Response(`Webhook signature invalid: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        break;
    }
  } catch (err: any) {
    console.error(`[stripe/webhook] error handling ${event.type}:`, err);
    // Return 500 so Stripe retries the event
    return new Response(`Handler error: ${err.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function __testDispatchStripeEvent(event: {
  type: string;
  data: { object: unknown };
}) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.payment_succeeded":
      await handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await handleInvoiceFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      throw new Error(`Evento Stripe de teste n�o suportado: ${event.type}`);
  }
}
