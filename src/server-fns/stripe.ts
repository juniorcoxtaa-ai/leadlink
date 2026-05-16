import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { db } from "@/db";
import { organizations, subscriptions, user } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ensureOrganization } from "@/server-fns/plans";

type PlanSlug = "pro" | "comercial" | "comercial_ia";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireSession() {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new Error("Não autenticado");
  return session;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getStripeDeps() {
  const [{ getStripe }, config] = await Promise.all([
    import("@/lib/stripe"),
    import("@/config.server"),
  ]);

  return {
    stripe: getStripe(),
    baseUrl: config.APP_URL.replace(/\/$/, ""),
    priceMap: {
      pro: config.STRIPE_PRO_PRICE_ID,
      comercial: config.STRIPE_COMERCIAL_PRICE_ID,
      comercial_ia: config.STRIPE_COMERCIAL_PRICE_ID,
    } satisfies Record<PlanSlug, string>,
  };
}

async function getOrCreateStripeCustomer(
  stripe: Awaited<ReturnType<typeof getStripeDeps>>["stripe"],
  orgId: string,
  email: string,
  name: string,
): Promise<string> {
  const [org] = await db
    .select({ stripeCustomerId: organizations.stripeCustomerId })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (org?.stripeCustomerId) return org.stripeCustomerId;

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { organizationId: orgId },
  });

  await db
    .update(organizations)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(organizations.id, orgId));

  return customer.id;
}

async function getActiveSubscription(orgId: string) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, orgId),
        inArray(subscriptions.status, ["active", "trialing", "past_due"]),
      ),
    )
    .orderBy(subscriptions.createdAt)
    .limit(1);
  return sub ?? null;
}

// ─── Criar sessão de checkout ─────────────────────────────────────────────────

const _createCheckoutSession = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const { planSlug } = ctx.data as unknown as { planSlug: PlanSlug };
  const session = await requireSession();
  const userId = session.user.id;

  const [u] = await db
    .select({ organizationId: user.organizationId, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const orgId =
    u?.organizationId ?? (await ensureOrganization(userId, u?.name ?? session.user.name));

  const { stripe, baseUrl, priceMap } = await getStripeDeps();
  const priceId = priceMap[planSlug];
  if (!priceId)
    throw new Error(
      `Price ID não configurado para o plano "${planSlug}". Verifique STRIPE_PRO_PRICE_ID / STRIPE_COMERCIAL_PRICE_ID no .env`,
    );

  const stripeCustomerId = await getOrCreateStripeCustomer(
    stripe,
    orgId,
    u?.email ?? session.user.email,
    u?.name ?? session.user.name,
  );

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    payment_method_collection: "always",
    success_url: `${baseUrl}/planos?success=true`,
    cancel_url: `${baseUrl}/planos?canceled=true`,
    // Both session metadata AND subscription metadata so webhook can resolve the org
    // even if checkout.session.completed fires before stripeCustomerId is written to DB
    metadata: { organizationId: orgId, planSlug },
    subscription_data: {
      metadata: { organizationId: orgId, planSlug },
    },
    allow_promotion_codes: true,
  });

  if (!checkoutSession.url) throw new Error("Falha ao criar sessão de checkout");

  return { url: checkoutSession.url };
});

export const createCheckoutSession = _createCheckoutSession as unknown as (opts: {
  data: { planSlug: PlanSlug };
}) => ReturnType<typeof _createCheckoutSession>;

export const saveBillingInfoAndCheckout = createServerFn({ method: "POST" }).handler(
  async (ctx) => {
    const session = await requireSession();
    const userId = session.user.id;
    const data = (ctx.data as Record<string, unknown> | undefined) ?? {};
    const planSlug = data.planSlug as PlanSlug;

    if (!planSlug || !["pro", "comercial", "comercial_ia"].includes(planSlug)) {
      throw new Error("Plano inválido");
    }

    const billingName = typeof data.billingName === "string" ? data.billingName.trim() : "";
    const billingEmail = typeof data.billingEmail === "string" ? data.billingEmail.trim() : "";
    const billingAddressLine1 =
      typeof data.billingAddressLine1 === "string" ? data.billingAddressLine1.trim() : "";
    const billingAddressCity =
      typeof data.billingAddressCity === "string" ? data.billingAddressCity.trim() : "";
    const billingAddressState =
      typeof data.billingAddressState === "string" ? data.billingAddressState.trim() : "";
    const billingAddressZip =
      typeof data.billingAddressZip === "string" ? data.billingAddressZip.trim() : "";
    const cpfCnpj = typeof data.cpfCnpj === "string" ? data.cpfCnpj.trim() : "";

    if (
      !billingName ||
      !billingEmail ||
      !billingAddressLine1 ||
      !billingAddressCity ||
      !billingAddressState ||
      !billingAddressZip ||
      !cpfCnpj
    ) {
      throw new Error("Preencha os dados de cobrança para continuar.");
    }

    await db
      .update(user)
      .set({
        cpfCnpj,
        billingName,
        billingEmail,
        billingAddressLine1,
        billingAddressCity,
        billingAddressState,
        billingAddressZip,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    return createCheckoutSession({ data: { planSlug } });
  },
);

// ─── Portal do cliente ────────────────────────────────────────────────────────

export const createCustomerPortalSession = createServerFn({ method: "POST" }).handler(async () => {
  const session = await requireSession();
  const userId = session.user.id;

  const [u] = await db
    .select({ organizationId: user.organizationId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!u?.organizationId) throw new Error("Organização não encontrada. Tente recarregar a página.");

  const [org] = await db
    .select({ stripeCustomerId: organizations.stripeCustomerId })
    .from(organizations)
    .where(eq(organizations.id, u.organizationId))
    .limit(1);

  // Bug fix #5: clearer message + guidance for orgs activated manually by admin
  if (!org?.stripeCustomerId) {
    throw new Error(
      "Sua assinatura foi ativada manualmente pelo suporte. Para gerenciar, entre em contato conosco.",
    );
  }

  const { stripe, baseUrl } = await getStripeDeps();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${baseUrl}/planos`,
  });

  return { url: portalSession.url };
});

// ─── Cancelar assinatura ──────────────────────────────────────────────────────

export const cancelSubscription = createServerFn({ method: "POST" }).handler(async () => {
  const session = await requireSession();
  const userId = session.user.id;

  const [u] = await db
    .select({ organizationId: user.organizationId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!u?.organizationId) throw new Error("Organização não encontrada");

  const sub = await getActiveSubscription(u.organizationId);
  if (!sub?.stripeSubscriptionId) {
    throw new Error(
      "Nenhuma assinatura ativa encontrada. Se o problema persistir, contate o suporte.",
    );
  }

  const { stripe } = await getStripeDeps();
  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  // Optimistic local update — webhook will confirm
  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
    .where(eq(subscriptions.id, sub.id));

  return { ok: true };
});

// ─── Reativar assinatura ──────────────────────────────────────────────────────

export const reactivateSubscription = createServerFn({ method: "POST" }).handler(async () => {
  const session = await requireSession();
  const userId = session.user.id;

  const [u] = await db
    .select({ organizationId: user.organizationId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!u?.organizationId) throw new Error("Organização não encontrada");

  const sub = await getActiveSubscription(u.organizationId);
  if (!sub?.stripeSubscriptionId) {
    throw new Error(
      "Nenhuma assinatura ativa encontrada. Se o problema persistir, contate o suporte.",
    );
  }

  const { stripe } = await getStripeDeps();
  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  // Optimistic local update — webhook will confirm
  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: false, updatedAt: new Date() })
    .where(eq(subscriptions.id, sub.id));

  return { ok: true };
});
