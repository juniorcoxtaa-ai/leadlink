import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { meuLinkConfigs, organizations, plans, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { DEFAULT_QUIZ_BLOCKS } from "@/lib/quiz-blocks";
import { getEffectivePlanSlug, getPlanCapabilities } from "@/lib/plans";
import { validateSlug } from "@/lib/slug";

const DEMO_AUTH_USER_ID = "demo-user-vista-mar-prime";

async function requireSession() {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new Error("Não autenticado");
  return session;
}

function isFreePlan(planSlug?: string | null) {
  return getPlanCapabilities(planSlug).leadsLimit === 15;
}

function assertNotDemoUser(userId: string) {
  if (userId === DEMO_AUTH_USER_ID) {
    throw new Error("Conta demo não pode usar o fluxo autenticado");
  }
}

function restrictedSignature(config: any) {
  const videos = Array.isArray(config?.videos)
    ? config.videos.map((video: any) => ({
        id: String(video?.id ?? ""),
        title: String(video?.title ?? ""),
        url: String(video?.url ?? ""),
        enabled: Boolean(video?.enabled),
      }))
    : [];

  return JSON.stringify({
    bgImage: String(config?.bgImage ?? ""),
    bgStyle: String(config?.bgStyle ?? "paper"),
    videos,
    quizBlocks: config?.quizBlocks ?? DEFAULT_QUIZ_BLOCKS,
  });
}

function normalizeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeBool(value: unknown, fallback = false) {
  if (value === true) return true;
  if (value === false || value == null) return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return fallback;
}

function sanitizeLinks(links: unknown, fallback: any[] = []) {
  return Array.isArray(links) ? links : fallback;
}

function sanitizeStats(stats: unknown, fallback: any[] = []) {
  return Array.isArray(stats) ? stats : fallback;
}

function sanitizeFeaturedIds(featuredIds: unknown, fallback: string[] = []) {
  return Array.isArray(featuredIds) ? featuredIds.filter((id): id is string => typeof id === "string") : fallback;
}

function sanitizeVideos(videos: unknown) {
  if (!Array.isArray(videos)) return [];
  return videos.map((video: any) => ({
    id: String(video?.id ?? ""),
    title: normalizeString(video?.title),
    url: normalizeString(video?.url),
    enabled: normalizeBool(video?.enabled),
  }));
}

function sanitizeQuizBlocksForFree(previous: any) {
  return DEFAULT_QUIZ_BLOCKS;
}

function sanitizeMeuLinkConfigPayload(incoming: any, previous: any, allowPremium: boolean) {
  const base = previous && typeof previous === "object" ? previous : {};
  const nextBgStyle = normalizeString(incoming?.bgStyle, normalizeString(base.bgStyle, "paper"));
  const safeBgStyle = nextBgStyle === "image" && !allowPremium ? "paper" : nextBgStyle;

  return {
    name: normalizeString(incoming?.name, normalizeString(base.name)),
    subtitle: normalizeString(incoming?.subtitle, normalizeString(base.subtitle)),
    bio: normalizeString(incoming?.bio, normalizeString(base.bio)),
    city: normalizeString(incoming?.city, normalizeString(base.city)),
    whatsapp: normalizeString(incoming?.whatsapp, normalizeString(base.whatsapp)),
    slug: normalizeString(incoming?.slug, normalizeString(base.slug)),
    verified: normalizeBool(incoming?.verified, Boolean(base.verified)),
    ctaText: normalizeString(incoming?.ctaText, normalizeString(base.ctaText)),
    photoUrl: normalizeString(incoming?.photoUrl, normalizeString(base.photoUrl)),
    accent: normalizeString(incoming?.accent, normalizeString(base.accent, "emerald")),
    bgStyle: safeBgStyle,
    bgImage: allowPremium ? normalizeString(incoming?.bgImage, normalizeString(base.bgImage)) : "",
    font: normalizeString(incoming?.font, normalizeString(base.font, "editorial")),
    btnShape: normalizeString(incoming?.btnShape, normalizeString(base.btnShape, "pill")),
    glass: normalizeBool(incoming?.glass, Boolean(base.glass)),
    stats: sanitizeStats(incoming?.stats, base.stats ?? []),
    links: sanitizeLinks(incoming?.links, base.links ?? []),
    videos: allowPremium ? sanitizeVideos(incoming?.videos) : [],
    quizBlocks: allowPremium ? incoming?.quizBlocks ?? base.quizBlocks ?? DEFAULT_QUIZ_BLOCKS : sanitizeQuizBlocksForFree(base),
    quizIntro: normalizeString(incoming?.quizIntro, normalizeString(base.quizIntro)),
    featuredIds: sanitizeFeaturedIds(incoming?.featuredIds, base.featuredIds ?? []),
  };
}

export function buildMeuLinkSaveData(params: {
  sessionUserId: string;
  sessionPlanSlug?: string | null;
  sessionSlug?: string | null;
  existingRow?: { slug: string; data: any } | null;
  incoming: any;
}) {
  const { sessionUserId, sessionPlanSlug, sessionSlug, existingRow, incoming } = params;
  assertNotDemoUser(sessionUserId);

  const userId = sessionUserId;
  const ownedRow = existingRow ?? null;
  const resolvedSlug =
    normalizeString(incoming?.slug) || normalizeString(sessionSlug) || normalizeString(ownedRow?.slug);
  const slugCheck = validateSlug(resolvedSlug);
  if (!slugCheck.ok) {
    throw new Error("Configure seu endereço personalizado primeiro");
  }

  const payload = sanitizeMeuLinkConfigPayload(
    incoming,
    ownedRow?.data ?? {},
    !isFreePlan(sessionPlanSlug),
  );

  return {
    userId,
    slug: slugCheck.slug,
    config: payload,
  };
}

export function sanitizePublicMeuLinkConfig(data: any, ownerPlanSlug?: string | null) {
  if (!isFreePlan(ownerPlanSlug)) return data;
  return {
    ...data,
    bgImage: "",
    bgStyle: data?.bgStyle === "image" ? "paper" : data?.bgStyle,
    videos: [],
    quizBlocks: DEFAULT_QUIZ_BLOCKS,
  };
}

export async function assertMeuLinkSlugAvailable(slug: string, sessionUserId: string) {
  const desiredSlug = normalizeString(slug);
  if (!desiredSlug) return;

  const [slugOwner] = await db
    .select({
      userId: meuLinkConfigs.userId,
    })
    .from(meuLinkConfigs)
    .where(eq(meuLinkConfigs.slug, desiredSlug))
    .limit(1);

  if (slugOwner?.userId && slugOwner.userId !== sessionUserId) {
    throw new Error("Slug pertence a outro usuário");
  }

  const [slugUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.slug, desiredSlug), ne(user.id, sessionUserId)))
    .limit(1);

  if (slugUser) {
    throw new Error("Slug pertence a outro usuário");
  }
}

const _saveMeuLinkConfig = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const data = ctx.data as unknown as { slug: string; config: unknown; userId?: unknown };
  const session = await requireSession();
  assertNotDemoUser(session.user.id);
  const [currentUser] = await db
    .select({
      planSlug: user.planSlug,
      slug: user.slug,
      organizationPlanSlug: plans.slug,
    })
    .from(user)
    .leftJoin(organizations, eq(user.organizationId, organizations.id))
    .leftJoin(plans, eq(organizations.planId, plans.id))
    .where(eq(user.id, session.user.id))
    .limit(1);

  const [ownedRow] = await db
    .select({
      slug: meuLinkConfigs.slug,
      data: meuLinkConfigs.data,
    })
    .from(meuLinkConfigs)
    .where(eq(meuLinkConfigs.userId, session.user.id))
    .limit(1);

  const desiredSlug = String(
    data.slug ?? (data.config as any)?.slug ?? currentUser?.slug ?? ownedRow?.slug ?? "",
  ).trim();

  await assertMeuLinkSlugAvailable(desiredSlug, session.user.id);

  const normalized = buildMeuLinkSaveData({
    sessionUserId: session.user.id,
    sessionPlanSlug: getEffectivePlanSlug(currentUser),
    sessionSlug: currentUser?.slug ?? null,
    existingRow: ownedRow,
    incoming: data.config,
  });

  if (ownedRow) {
    await db
      .update(meuLinkConfigs)
      .set({
        slug: normalized.slug,
        userId: session.user.id,
        data: normalized.config,
        updatedAt: new Date(),
      })
      .where(eq(meuLinkConfigs.userId, session.user.id));
    return { ok: true };
  }

  await db
    .insert(meuLinkConfigs)
    .values({
      slug: normalized.slug,
      userId: session.user.id,
      data: normalized.config,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: meuLinkConfigs.slug,
      where: eq(meuLinkConfigs.userId, session.user.id),
      set: {
        userId: session.user.id,
        data: normalized.config,
        updatedAt: new Date(),
      },
    });

  return { ok: true };
});

export const saveMeuLinkConfig = _saveMeuLinkConfig as unknown as (opts: { data: { slug: string; config: unknown } }) => ReturnType<typeof _saveMeuLinkConfig>;

const _loadMeuLinkConfig = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireSession();
  assertNotDemoUser(session.user.id);
  const [row] = await db
    .select()
    .from(meuLinkConfigs)
    .where(eq(meuLinkConfigs.userId, session.user.id))
    .limit(1);
  return row?.data ?? null;
});

export const getMeuLinkConfig = _loadMeuLinkConfig as unknown as () => ReturnType<typeof _loadMeuLinkConfig>;

const _loadMeuLinkConfigPublic = createServerFn({ method: "GET" }).handler(async (ctx) => {
  const slug = ctx.data as unknown as string;
  if (!slug) return null;
  const [row] = await db
    .select()
    .from(meuLinkConfigs)
    .where(eq(meuLinkConfigs.slug, slug))
    .limit(1);
  if (!row?.data) return null;
  const [owner] = await db
    .select({ planSlug: user.planSlug, organizationPlanSlug: plans.slug })
    .from(user)
    .leftJoin(organizations, eq(user.organizationId, organizations.id))
    .leftJoin(plans, eq(organizations.planId, plans.id))
    .where(eq(user.id, row.userId ?? ""))
    .limit(1);
  return sanitizePublicMeuLinkConfig(row.data, getEffectivePlanSlug(owner));
});

export const loadMeuLinkConfig = _loadMeuLinkConfigPublic as unknown as (opts: { data: string }) => ReturnType<typeof _loadMeuLinkConfigPublic>;

const _getMySlug = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireSession();
  assertNotDemoUser(session.user.id);
  const [row] = await db
    .select({ slug: meuLinkConfigs.slug })
    .from(meuLinkConfigs)
    .where(eq(meuLinkConfigs.userId, session.user.id))
    .limit(1);
  return row?.slug ?? null;
});

export const getMySlug = _getMySlug as unknown as () => ReturnType<typeof _getMySlug>;
