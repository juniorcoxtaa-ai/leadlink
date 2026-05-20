import { db } from "@/db";
import {
  activities,
  leads,
  organizations,
  plans,
  properties,
  session as sessions,
  user,
} from "@/db/schema";
import { getEffectivePlanSlug } from "@/lib/plans";
import { and, desc, eq, gt } from "drizzle-orm";

const EXTENSION_PLANS = new Set(["pro", "comercial", "comercial_ia"]);

export type ExtensionAuthUser = {
  id: string;
  name: string;
  email: string;
  initials: string | null;
  planSlug: string;
  slug: string | null;
};

export type ExtensionSession = {
  token: string;
  user: ExtensionAuthUser;
};

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin =
    origin.startsWith("chrome-extension://") ||
    origin === "http://localhost:8080" ||
    origin === "http://127.0.0.1:8080" ||
    origin === "http://localhost:3000" ||
    origin === "http://127.0.0.1:3000" ||
    origin === "https://leadlink.app.br" ||
    origin === "https://www.leadlink.app.br"
      ? origin
      : "http://localhost:3000";

  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

export function jsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(request),
    },
  });
}

export function optionsResponse(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export function errorResponse(request: Request, status: number, error: string, code?: string) {
  return jsonResponse(request, { error, code }, status);
}

export function isDatabaseUnavailableError(error: unknown) {
  const message = String(
    (error as { message?: string; code?: string; cause?: { message?: string } })?.message ||
      (error as { cause?: { message?: string } })?.cause?.message ||
      "",
  ).toUpperCase();
  const code = String((error as { code?: string })?.code || "").toUpperCase();

  return (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "57P01" ||
    code === "57P03" ||
    message.includes("CONNECTION_CLOSED") ||
    message.includes("CONNECT_TIMEOUT") ||
    message.includes("ECONNRESET") ||
    message.includes("ECONNREFUSED") ||
    message.includes("TERMINATING CONNECTION") ||
    message.includes("THE DATABASE SYSTEM IS STARTING UP")
  );
}

export function handleExtensionRouteError(request: Request, error: unknown) {
  console.error("[LeadLink][extension-api] route failure", error);
  if (isDatabaseUnavailableError(error)) {
    return errorResponse(
      request,
      503,
      "Banco temporariamente indisponivel. Tente novamente em instantes.",
      "db_unavailable",
    );
  }
  return errorResponse(request, 500, "Erro interno da extensao.", "internal_error");
}

export async function withExtensionRouteErrorHandling(request: Request, fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (error) {
    return handleExtensionRouteError(request, error);
  }
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function extensionUserPayload(row: {
  id: string;
  name: string;
  email: string;
  initials: string | null;
  slug: string | null;
  planSlug: string | null;
  organizationPlanSlug: string | null;
}): ExtensionAuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    initials: row.initials,
    slug: row.slug,
    planSlug: getEffectivePlanSlug({
      planSlug: row.planSlug,
      organizationPlanSlug: row.organizationPlanSlug,
    }),
  };
}

export async function getExtensionUserById(userId: string) {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      initials: user.initials,
      slug: user.slug,
      planSlug: user.planSlug,
      isBlocked: user.isBlocked,
      organizationPlanSlug: plans.slug,
    })
    .from(user)
    .leftJoin(organizations, eq(user.organizationId, organizations.id))
    .leftJoin(plans, eq(organizations.planId, plans.id))
    .where(eq(user.id, userId))
    .limit(1);

  if (!row || row.isBlocked) return null;
  const payload = extensionUserPayload(row);
  if (!EXTENSION_PLANS.has(payload.planSlug)) return null;
  return payload;
}

export async function requireExtensionSession(request: Request) {
  const token = bearerToken(request);
  if (!token) {
    return { response: errorResponse(request, 401, "Sessao ausente.", "unauthorized") };
  }

  const [row] = await db
    .select({
      token: sessions.token,
      id: user.id,
      name: user.name,
      email: user.email,
      initials: user.initials,
      slug: user.slug,
      planSlug: user.planSlug,
      isBlocked: user.isBlocked,
      organizationPlanSlug: plans.slug,
    })
    .from(sessions)
    .innerJoin(user, eq(sessions.userId, user.id))
    .leftJoin(organizations, eq(user.organizationId, organizations.id))
    .leftJoin(plans, eq(organizations.planId, plans.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row) {
    return { response: errorResponse(request, 401, "Sessao expirada.", "unauthorized") };
  }

  if (row.isBlocked) {
    return { response: errorResponse(request, 403, "Usuario bloqueado.", "blocked") };
  }

  const payload = extensionUserPayload(row);
  if (!EXTENSION_PLANS.has(payload.planSlug)) {
    return {
      response: errorResponse(
        request,
        403,
        "Seu plano atual nao inclui acesso a extensao.",
        "plan_no_extension",
      ),
    };
  }

  return { session: { token, user: payload } satisfies ExtensionSession };
}

export function normalizePhone(input: string | null | undefined) {
  return String(input ?? "").replace(/\D/g, "");
}

export function normalizePhoneDigits(phone: string | null | undefined) {
  return normalizePhone(phone);
}

export function stripBrazilCountryCode(phone: string | null | undefined) {
  const digits = normalizePhoneDigits(phone);
  return digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits;
}

function addVariant(variants: Set<string>, value: string) {
  if (value.length >= 10) variants.add(value);
}

function canonicalLocalVariants(phone: string | null | undefined) {
  const local = stripBrazilCountryCode(phone);
  const variants = new Set<string>();
  if (local.length >= 10 && local.length <= 11) variants.add(local);

  if (local.length === 10) {
    variants.add(`${local.slice(0, 2)}9${local.slice(2)}`);
  }

  if (local.length === 11 && local[2] === "9") {
    variants.add(`${local.slice(0, 2)}${local.slice(3)}`);
  }

  return variants;
}

function addSuffixes(variants: Set<string>, value: string) {
  for (const length of [8, 9, 10, 11]) {
    if (value.length >= length) variants.add(value.slice(-length));
  }
}

export function possiblePhoneVariants(phone: string | null | undefined) {
  const digits = normalizePhoneDigits(phone);
  const variants = new Set<string>();

  if (digits.length >= 10) addVariant(variants, digits);
  for (const local of canonicalLocalVariants(digits)) {
    addVariant(variants, local);
    addVariant(variants, `55${local}`);
  }

  for (const variant of Array.from(variants)) addSuffixes(variants, variant);

  return Array.from(variants);
}

export function matchBrazilianPhones(a: string | null | undefined, b: string | null | undefined) {
  const leftDigits = normalizePhoneDigits(a);
  const rightDigits = normalizePhoneDigits(b);
  if (leftDigits.length < 10 || rightDigits.length < 10) return false;

  const left = canonicalLocalVariants(leftDigits);
  const right = canonicalLocalVariants(rightDigits);
  for (const variant of right) {
    if (left.has(variant)) return true;
  }
  return false;
}

export function phoneVariants(input: string | null | undefined) {
  return possiblePhoneVariants(input);
}

export function mapLead(row: typeof leads.$inferSelect & { activity?: typeof activities.$inferSelect[] }) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    intentType: row.intentType,
    quizAnswers: row.quizAnswers,
    source: row.source,
    status: row.status,
    score: row.score,
    classification: row.classification,
    urgency: row.urgency,
    budgetRange: row.budgetRange,
    scoreDetail: row.scoreDetail,
    nextStep: row.nextStep,
    profileSummary: row.profileSummary,
    interest: row.interest,
    budget: row.budget,
    region: row.region,
    timeline: row.timeline,
    notes: row.notes,
    createdAt: row.createdAt?.toISOString() ?? null,
    lastContact: row.lastContact?.toISOString() ?? null,
    activity: row.activity?.map((item) => ({
      id: item.id,
      type: item.type,
      text: item.text,
      createdAt: item.createdAt?.toISOString() ?? null,
    })),
  };
}

export function mapProperty(row: typeof properties.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    businessType: row.businessType,
    status: row.status,
    price: row.price,
    area: row.area,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    parking: row.parking,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    image: row.image,
    images: Array.isArray(row.images) ? row.images : [],
  };
}

export async function getLeadActivity(leadId: string) {
  return db
    .select()
    .from(activities)
    .where(eq(activities.leadId, leadId))
    .orderBy(desc(activities.createdAt))
    .limit(10);
}

export { activities, db, desc, eq, leads, properties, sessions };
