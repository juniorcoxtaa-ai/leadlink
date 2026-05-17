import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { db } from "@/db";
import { properties, user, meuLinkConfigs, organizations, plans } from "@/db/schema";
import { eq, desc, inArray, and, count, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { assertCanCreateProperty } from "@/lib/plans";

async function requireSession() {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new Error("Não autenticado");
  return session;
}

async function requirePropertyOwnership(
  propertyId: string,
  session: Awaited<ReturnType<typeof requireSession>>,
) {
  const [prop] = await db
    .select({
      id: properties.id,
      brokerId: properties.brokerId,
      brokerOrganizationId: user.organizationId,
    })
    .from(properties)
    .leftJoin(user, eq(properties.brokerId, user.id))
    .where(eq(properties.id, propertyId));

  if (!prop) throw new Error("Imóvel não encontrado");

  const userOrgId = (session.user as any).organizationId as string | undefined;
  if (
    prop.brokerId !== session.user.id &&
    (!userOrgId || prop.brokerOrganizationId !== userOrgId)
  ) {
    throw new Error("Unauthorized");
  }

  return prop;
}

export const getProperties = createServerFn({ method: "GET" }).handler(async (): Promise<any> => {
  const session = await requireSession();
  const isAdmin = (session.user as any).role === "admin";

  const rows = await db
    .select({
      id: properties.id,
      code: properties.code,
      title: properties.title,
      type: properties.type,
      businessType: properties.businessType,
      status: properties.status,
      price: properties.price,
      condoValue: properties.condoValue,
      iptuValue: properties.iptuValue,
      area: properties.area,
      bedrooms: properties.bedrooms,
      bathrooms: properties.bathrooms,
      parking: properties.parking,
      neighborhood: properties.neighborhood,
      city: properties.city,
      state: properties.state,
      description: properties.description,
      features: properties.features,
      brokerId: properties.brokerId,
      image: properties.image,
      images: properties.images,
      highlight: properties.highlight,
      views: properties.views,
      leadsCount: properties.leadsCount,
      createdAt: properties.createdAt,
      brokerName: user.name,
      brokerInitials: user.initials,
    })
    .from(properties)
    .leftJoin(user, eq(properties.brokerId, user.id));
  const result = isAdmin
    ? await db.select().from(properties).orderBy(desc(properties.createdAt))
    : await db
        .select()
        .from(properties)
        .where(eq(properties.brokerId, session.user.id))
        .orderBy(desc(properties.createdAt));

  return (isAdmin ? rows : result) as any;
});

type CreatePropertyInput = {
  code?: string;
  title: string;
  type: string;
  businessType?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  state?: string;
  status?: string;
  price: number;
  condoValue?: number;
  iptuValue?: number;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  neighborhood: string;
  city?: string;
  brokerId?: string;
  image?: string;
  images?: string[];
  highlight?: string;
  description?: string;
  features?: Record<string, boolean | number>;
};

type UpdatePropertyInput = Partial<CreatePropertyInput> & {
  id: string;
};

export function propertyUpdateValues(data: Partial<CreatePropertyInput>) {
  return {
    ...(typeof data.title === "string" ? { title: data.title.trim() } : {}),
    ...(typeof data.type === "string" ? { type: data.type.trim() } : {}),
    ...(typeof data.businessType === "string" ? { businessType: data.businessType.trim() } : {}),
    ...(typeof data.cep === "string" ? { cep: data.cep.trim() || null } : {}),
    ...(typeof data.street === "string" ? { street: data.street.trim() || null } : {}),
    ...(typeof data.number === "string" ? { number: data.number.trim() || null } : {}),
    ...(typeof data.complement === "string" ? { complement: data.complement.trim() || null } : {}),
    ...(typeof data.state === "string" ? { state: data.state.trim() || null } : {}),
    ...(typeof data.status === "string" ? { status: data.status.trim() } : {}),
    ...(typeof data.price === "number" ? { price: Math.round(data.price) } : {}),
    ...(typeof data.condoValue === "number" ? { condoValue: Math.round(data.condoValue) } : {}),
    ...(typeof data.iptuValue === "number" ? { iptuValue: Math.round(data.iptuValue) } : {}),
    ...(typeof data.area === "number" ? { area: Math.round(data.area) } : {}),
    ...(typeof data.bedrooms === "number" ? { bedrooms: Math.round(data.bedrooms) } : {}),
    ...(typeof data.bathrooms === "number" ? { bathrooms: Math.round(data.bathrooms) } : {}),
    ...(typeof data.parking === "number" ? { parking: Math.round(data.parking) } : {}),
    ...(typeof data.neighborhood === "string" ? { neighborhood: data.neighborhood.trim() } : {}),
    ...(typeof data.city === "string" ? { city: data.city.trim() } : {}),
    ...(typeof data.image === "string" ? { image: data.image.trim() || null } : {}),
    ...(Array.isArray(data.images) ? { images: data.images } : {}),
    ...(typeof data.highlight === "string" ? { highlight: data.highlight.trim() || null } : {}),
    ...(typeof data.description === "string" ? { description: data.description.trim() || null } : {}),
    ...(data.features && typeof data.features === "object" ? { features: data.features } : {}),
  };
}

function slugifyCode(title: string) {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `IM-${base || "novo"}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const _createProperty = createServerFn({ method: "POST" }).handler(async (ctx): Promise<any> => {
  const data = ctx.data as unknown as CreatePropertyInput;
  const session = await requireSession();
  const isAdmin = (session.user as any).role === "admin";
  const brokerId = isAdmin && data.brokerId ? data.brokerId : session.user.id;
  const [brokerRow] = await db
    .select({
      planSlug: user.planSlug,
      organizationPlanSlug: plans.slug,
    })
    .from(user)
    .leftJoin(organizations, eq(user.organizationId, organizations.id))
    .leftJoin(plans, eq(organizations.planId, plans.id))
    .where(eq(user.id, brokerId))
    .limit(1);
  const [countRow] = await db
    .select({ count: count() })
    .from(properties)
    .where(eq(properties.brokerId, brokerId));
  if (!isAdmin) {
    assertCanCreateProperty(brokerRow as any, Number(countRow?.count ?? 0));
  }
  const code = data.code || slugifyCode(data.title);
  const [prop] = await db
    .insert(properties)
    .values({ ...data, code, brokerId, status: data.status || "Disponível" })
    .returning();
  return prop as any;
});

export const createProperty = _createProperty as unknown as (opts: {
  data: CreatePropertyInput;
}) => ReturnType<typeof _createProperty>;

const _updateProperty = createServerFn({ method: "POST" }).handler(async (ctx): Promise<any> => {
  const data = ctx.data as unknown as UpdatePropertyInput;
  const session = await requireSession();
  await requirePropertyOwnership(data.id, session);
  const values = propertyUpdateValues(data);
  const [prop] = await db
    .update(properties)
    .set(values)
    .where(eq(properties.id, data.id))
    .returning();
  return prop as any;
});

export const updateProperty = _updateProperty as unknown as (opts: {
  data: UpdatePropertyInput;
}) => ReturnType<typeof _updateProperty>;

const _updatePropertyStatus = createServerFn({ method: "POST" }).handler(
  async (ctx): Promise<any> => {
    const data = ctx.data as unknown as { id: string; status: string };
    const session = await requireSession();
    await requirePropertyOwnership(data.id, session);
    const [prop] = await db
      .update(properties)
      .set({ status: data.status })
      .where(eq(properties.id, data.id))
      .returning();
    return prop as any;
  },
);

export const updatePropertyStatus = _updatePropertyStatus as unknown as (opts: {
  data: { id: string; status: string };
}) => ReturnType<typeof _updatePropertyStatus>;

const _searchProperties = createServerFn({ method: "GET" }).handler(async (ctx): Promise<any> => {
  const query = String(ctx.data ?? "").trim();
  if (query.length < 2) return [];
  const session = await requireSession();
  const isAdmin = (session.user as any).role === "admin";
  const pattern = `%${query}%`;
  const rows = await db
    .select({
      id: properties.id,
      code: properties.code,
      title: properties.title,
      neighborhood: properties.neighborhood,
      city: properties.city,
      status: properties.status,
      image: properties.image,
    })
    .from(properties)
    .where(
      and(
        isAdmin ? undefined : eq(properties.brokerId, session.user.id),
        or(
          ilike(properties.code, pattern),
          ilike(properties.title, pattern),
          ilike(properties.neighborhood, pattern),
          ilike(properties.city, pattern),
        ),
      ),
    )
    .orderBy(desc(properties.createdAt))
    .limit(8);
  return rows as any;
});

export const searchProperties = _searchProperties as unknown as (opts: {
  data: string;
}) => ReturnType<typeof _searchProperties>;

const _getPropertiesByIds = createServerFn({ method: "GET" }).handler(async (ctx): Promise<any> => {
  const ids = ctx.data as unknown as string[];
  if (!ids || !ids.length) return [];
  const rows = await db.select().from(properties).where(inArray(properties.id, ids));
  return rows as any;
});

export const getPropertiesByIds = _getPropertiesByIds as unknown as (opts: {
  data: string[];
}) => ReturnType<typeof _getPropertiesByIds>;

export async function getPropertyPublicBySlug(slug: string, propertyId: string) {
  const [config] = await db
    .select({ userId: meuLinkConfigs.userId })
    .from(meuLinkConfigs)
    .where(eq(meuLinkConfigs.slug, slug))
    .limit(1);
  if (!config?.userId) return null;

  const [prop] = await db
    .select({
      id: properties.id,
      code: properties.code,
      title: properties.title,
      type: properties.type,
      businessType: properties.businessType,
      status: properties.status,
      price: properties.price,
      condoValue: properties.condoValue,
      iptuValue: properties.iptuValue,
      area: properties.area,
      bedrooms: properties.bedrooms,
      bathrooms: properties.bathrooms,
      parking: properties.parking,
      neighborhood: properties.neighborhood,
      city: properties.city,
      state: properties.state,
      description: properties.description,
      features: properties.features,
      image: properties.image,
      images: properties.images,
      highlight: properties.highlight,
    })
    .from(properties)
    .where(
      and(
        eq(properties.id, propertyId),
        eq(properties.brokerId, config.userId),
        eq(properties.status, "Disponível"),
      ),
    );
  return (prop as any) ?? null;
}

const _getPropertyPublic = createServerFn({ method: "GET" }).handler(async (ctx): Promise<any> => {
  const input = ctx.data as unknown as string | { slug?: string; propertyId?: string };
  if (typeof input === "object" && input?.slug && input?.propertyId) {
    return getPropertyPublicBySlug(input.slug, input.propertyId);
  }

  const id = String(input ?? "");
  const [prop] = await db
    .select({
      id: properties.id,
      code: properties.code,
      title: properties.title,
      type: properties.type,
      businessType: properties.businessType,
      status: properties.status,
      price: properties.price,
      area: properties.area,
      bedrooms: properties.bedrooms,
      bathrooms: properties.bathrooms,
      parking: properties.parking,
      neighborhood: properties.neighborhood,
      city: properties.city,
      description: properties.description,
      features: properties.features,
      image: properties.image,
      images: properties.images,
      highlight: properties.highlight,
    })
    .from(properties)
    .where(and(eq(properties.id, id), eq(properties.status, "Disponível")));
  return (prop as any) ?? null;
});

export const getPropertyPublic = _getPropertyPublic as unknown as (opts: {
  data: string | { slug: string; propertyId: string };
}) => ReturnType<typeof _getPropertyPublic>;

const _getPropertiesBySlug = createServerFn({ method: "GET" }).handler(
  async (ctx): Promise<any> => {
    const slug = ctx.data as unknown as string;
    const [config] = await db
      .select({ userId: meuLinkConfigs.userId })
      .from(meuLinkConfigs)
      .where(eq(meuLinkConfigs.slug, slug));
    if (!config?.userId) return [];
    const rows = await db
      .select({
        id: properties.id,
        code: properties.code,
        title: properties.title,
        type: properties.type,
        businessType: properties.businessType,
        status: properties.status,
        price: properties.price,
        condoValue: properties.condoValue,
        iptuValue: properties.iptuValue,
        area: properties.area,
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        parking: properties.parking,
        neighborhood: properties.neighborhood,
        city: properties.city,
        state: properties.state,
        description: properties.description,
        features: properties.features,
        image: properties.image,
        images: properties.images,
        highlight: properties.highlight,
      })
      .from(properties)
      .where(and(eq(properties.brokerId, config.userId), eq(properties.status, "Disponível")))
      .orderBy(desc(properties.createdAt));
    return rows as any;
  },
);

export const getPropertiesBySlug = _getPropertiesBySlug as unknown as (opts: {
  data: string;
}) => ReturnType<typeof _getPropertiesBySlug>;
