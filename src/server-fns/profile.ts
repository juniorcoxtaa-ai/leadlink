import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { meuLinkConfigs, organizations, plans, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { calculateProfileCompleteness } from "@/lib/plans";
import { validateSlug } from "@/lib/slug";

async function requireSession() {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new Error("Não autenticado");
  return session;
}

function normalizeInput(data: Record<string, unknown>) {
  const rawSlug = typeof data.slug === "string" ? data.slug : "";
  const slugCheck = validateSlug(rawSlug);
  if (!slugCheck.ok) throw new Error(slugCheck.message);
  return {
    slug: slugCheck.slug,
    displayName: typeof data.displayName === "string" ? data.displayName.trim() : "",
    bio: typeof data.bio === "string" ? data.bio.trim() : "",
    creci: typeof data.creci === "string" ? data.creci.trim() : "",
    avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl.trim() : null,
    coverImageUrl: typeof data.coverImageUrl === "string" ? data.coverImageUrl.trim() : null,
    specialty: Array.isArray(data.specialty)
      ? data.specialty.filter((item): item is string => typeof item === "string")
      : [],
    yearsExperience: typeof data.yearsExperience === "number" ? data.yearsExperience : null,
    city: typeof data.city === "string" ? data.city.trim() : "",
    state: typeof data.state === "string" ? data.state.trim() : "",
    instagramUrl: typeof data.instagramUrl === "string" ? data.instagramUrl.trim() : null,
    whatsappNumber: typeof data.whatsappNumber === "string" ? data.whatsappNumber.trim() : "",
    websiteUrl: typeof data.websiteUrl === "string" ? data.websiteUrl.trim() : null,
    cpfCnpj: typeof data.cpfCnpj === "string" ? data.cpfCnpj.trim() : null,
    billingName: typeof data.billingName === "string" ? data.billingName.trim() : null,
    billingEmail: typeof data.billingEmail === "string" ? data.billingEmail.trim() : null,
    billingAddressLine1:
      typeof data.billingAddressLine1 === "string" ? data.billingAddressLine1.trim() : null,
    billingAddressCity:
      typeof data.billingAddressCity === "string" ? data.billingAddressCity.trim() : null,
    billingAddressState:
      typeof data.billingAddressState === "string" ? data.billingAddressState.trim() : null,
    billingAddressZip:
      typeof data.billingAddressZip === "string" ? data.billingAddressZip.trim() : null,
  };
}

async function syncMeuLinkProfile(userId: string, data: ReturnType<typeof normalizeInput>) {
  const [ownedRow] = await db
    .select({
      slug: meuLinkConfigs.slug,
      data: meuLinkConfigs.data,
    })
    .from(meuLinkConfigs)
    .where(eq(meuLinkConfigs.userId, userId))
    .limit(1);

  const oldData =
    ownedRow?.data && typeof ownedRow.data === "object" && !Array.isArray(ownedRow.data)
      ? (ownedRow.data as Record<string, unknown>)
      : {};
  const photo = data.avatarUrl ?? "";
  const coverImageUrl = data.coverImageUrl ?? "";
  const merged: Record<string, unknown> = {
    ...oldData,
    whatsapp: data.whatsappNumber,
    name: data.displayName,
    displayName: data.displayName,
    photo,
    avatarUrl: photo,
    photoUrl: photo,
    coverImageUrl,
  };

  if (coverImageUrl) {
    merged.bgImage = coverImageUrl;
    merged.bgStyle = oldData.bgStyle === "image" || !oldData.bgStyle ? "image" : oldData.bgStyle;
  }

  if (ownedRow) {
    await db
      .update(meuLinkConfigs)
      .set({
        slug: data.slug,
        data: merged,
        updatedAt: new Date(),
      })
      .where(eq(meuLinkConfigs.userId, userId));
    return;
  }

  await db.insert(meuLinkConfigs).values({
    slug: data.slug,
    userId,
    data: merged,
    updatedAt: new Date(),
  });
}

export const getMyProfile = createServerFn({ method: "GET" }).handler(async (): Promise<any> => {
  const session = await requireSession();
  const [row] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
  if (!row) return null;

  const [org] = row.organizationId
    ? await db
        .select({
          subscriptionStatus: organizations.subscriptionStatus,
          planSlug: plans.slug,
        })
        .from(organizations)
        .leftJoin(plans, eq(organizations.planId, plans.id))
        .where(eq(organizations.id, row.organizationId))
        .limit(1)
    : [];

  return {
    ...row,
    organizationPlanSlug: org?.planSlug ?? null,
    organizationSubscriptionStatus: org?.subscriptionStatus ?? null,
  };
});

export const updateMyProfile = createServerFn({ method: "POST" }).handler(
  async (ctx): Promise<any> => {
    const session = await requireSession();
    const data = normalizeInput((ctx.data as unknown as Record<string, unknown>) || {});

    const [slugOwner] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.slug, data.slug), ne(user.id, session.user.id)))
      .limit(1);
    if (slugOwner) throw new Error("Este slug já está em uso.");

    const [meuLinkSlugOwner] = await db
      .select({ userId: meuLinkConfigs.userId })
      .from(meuLinkConfigs)
      .where(eq(meuLinkConfigs.slug, data.slug))
      .limit(1);
    if (meuLinkSlugOwner?.userId && meuLinkSlugOwner.userId !== session.user.id) {
      throw new Error("Este slug já está em uso.");
    }

    const profileCompleteness = calculateProfileCompleteness({
      ...data,
      specialty: data.specialty,
    } as any);

    const [updated] = await db
      .update(user)
      .set({
        slug: data.slug,
        publicName: data.displayName,
        displayName: data.displayName,
        bio: data.bio,
        creci: data.creci,
        avatarUrl: data.avatarUrl,
        coverImageUrl: data.coverImageUrl,
        specialty: data.specialty as any,
        especialidades: data.specialty as any,
        yearsExperience: data.yearsExperience,
        city: data.city,
        mainCity: data.city,
        state: data.state,
        instagramUrl: data.instagramUrl,
        instagram: data.instagramUrl,
        whatsappNumber: data.whatsappNumber,
        whatsapp: data.whatsappNumber,
        websiteUrl: data.websiteUrl,
        cpfCnpj: data.cpfCnpj,
        billingName: data.billingName,
        billingEmail: data.billingEmail,
        billingAddressLine1: data.billingAddressLine1,
        billingAddressCity: data.billingAddressCity,
        billingAddressState: data.billingAddressState,
        billingAddressZip: data.billingAddressZip,
        profileCompleteness: profileCompleteness.percentage,
        profileCompleted: profileCompleteness.percentage >= 100,
        onboardingCompleted: profileCompleteness.percentage >= 100,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id))
      .returning();

    await syncMeuLinkProfile(session.user.id, data);

    return updated;
  },
);

export const updateBillingInfo = createServerFn({ method: "POST" }).handler(
  async (ctx): Promise<any> => {
    const session = await requireSession();
    const data = (ctx.data as unknown as Record<string, unknown>) || {};
    const [updated] = await db
      .update(user)
      .set({
        cpfCnpj: typeof data.cpfCnpj === "string" ? data.cpfCnpj.trim() : null,
        billingName: typeof data.billingName === "string" ? data.billingName.trim() : null,
        billingEmail: typeof data.billingEmail === "string" ? data.billingEmail.trim() : null,
        billingAddressLine1:
          typeof data.billingAddressLine1 === "string" ? data.billingAddressLine1.trim() : null,
        billingAddressCity:
          typeof data.billingAddressCity === "string" ? data.billingAddressCity.trim() : null,
        billingAddressState:
          typeof data.billingAddressState === "string" ? data.billingAddressState.trim() : null,
        billingAddressZip:
          typeof data.billingAddressZip === "string" ? data.billingAddressZip.trim() : null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id))
      .returning();
    return updated;
  },
);

export const calculateProfileCompletenessForMe = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const profile = await getMyProfile();
    return calculateProfileCompleteness(profile ?? {}).percentage;
  },
);

export const updateUserProfile: any = updateMyProfile;
export const updateUserBillingInfo: any = updateBillingInfo;

export const checkSlugAvailability = createServerFn({ method: "GET" }).handler(
  async (ctx): Promise<any> => {
    const session = await requireSession();
    const input = typeof ctx.data === "string" ? ctx.data : "";
    const result = validateSlug(input);
    if (!result.ok) {
      return {
        available: false,
        slug: result.slug,
        reason: result.reason,
        message: result.message,
      };
    }
    const [row] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.slug, result.slug))
      .limit(1);
    if (!row) return { available: true, slug: result.slug };
    return {
      available: row.id === session.user.id,
      slug: result.slug,
      ownedByMe: row.id === session.user.id,
    };
  },
);
