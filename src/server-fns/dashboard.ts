import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { db } from "@/db";
import { leads, properties, appointments, user } from "@/db/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getMainImage } from "@/lib/property-images";

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

const _getDashboardData = createServerFn({ method: "GET" }).handler(async (): Promise<any> => {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new Error("Não autenticado");

  const isAdmin = (session.user as any).role === "admin";
  const userId = session.user.id;
  const today = startOfDay(new Date());
  const todayEnd = endOfDay(today);
  const userFilter = isAdmin ? undefined : eq(leads.brokerId, userId);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(userFilter);
  const [todayRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(userFilter ? and(userFilter, gte(leads.createdAt, today)) : gte(leads.createdAt, today));
  const [gainedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(userFilter ? and(userFilter, eq(leads.status, "ganho")) : eq(leads.status, "ganho"));

  const totalLeads = Number(totalRow.count);
  const todayLeads = Number(todayRow.count);
  const gained = Number(gainedRow.count);
  const conversion = totalLeads > 0 ? +((gained / totalLeads) * 100).toFixed(1) : 0;

  const funnelStatuses = ["novo", "contatado", "qualificado", "visita", "proposta", "ganho"];
  const funnel = await Promise.all(
    funnelStatuses.map(async (status) => {
      const statusFilter = eq(leads.status, status);
      const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(userFilter ? and(userFilter, statusFilter) : statusFilter);
      return { status, value: Number(row.count) };
    }),
  );

  const leadsOverTime = await Promise.all(
    Array.from({ length: 14 }).map(async (_, i) => {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - (13 - i));
      const dayStartAt = startOfDay(dayStart);
      const dayEndAt = endOfDay(dayStartAt);
      const rangeFilter = and(gte(leads.createdAt, dayStartAt), lte(leads.createdAt, dayEndAt));
      const fullFilter = userFilter ? and(userFilter, rangeFilter) : rangeFilter;
      const [allRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(fullFilter);
      const [gainedRowDay] = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(
          userFilter
            ? and(userFilter, eq(leads.status, "ganho"), rangeFilter)
            : and(eq(leads.status, "ganho"), rangeFilter),
        );
      return {
        day: `${dayStartAt.getDate()}/${dayStartAt.getMonth() + 1}`,
        leads: Number(allRow.count),
        ganhos: Number(gainedRowDay.count),
      };
    }),
  );

  const sources = ["Site", "ZAP", "OLX", "Viva Real", "Indicação", "Instagram"];
  const leadsBySource = await Promise.all(
    sources.map(async (source) => {
      const sourceFilter = eq(leads.source, source);
      const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(userFilter ? and(userFilter, sourceFilter) : sourceFilter);
      return { name: source, value: Number(row.count) };
    }),
  );

  const recentLeads = await db
    .select({
      id: leads.id,
      name: leads.name,
      source: leads.source,
      status: leads.status,
      score: leads.score,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(userFilter)
    .orderBy(desc(leads.createdAt))
    .limit(10);
  const todayAppointments = await db
    .select({
      id: appointments.id,
      title: appointments.title,
      type: appointments.type,
      leadName: appointments.leadName,
      propertyTitle: appointments.propertyTitle,
      location: appointments.location,
      date: appointments.date,
      duration: appointments.duration,
      status: appointments.status,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.brokerId, userId),
        gte(appointments.date, today),
        lte(appointments.date, todayEnd),
      ),
    )
    .orderBy(appointments.date);
  const featuredProperties = await db
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
      image: properties.image,
      highlight: properties.highlight,
      views: properties.views,
      leadsCount: properties.leadsCount,
      createdAt: properties.createdAt,
    })
    .from(properties)
    .where(eq(properties.brokerId, userId))
    .orderBy(desc(properties.views))
    .limit(3);
  const brokerStats: any[] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.id, userId));

  return {
    kpis: { total: totalLeads, today: todayLeads, conversion, responseTime: "8min" as const },
    funnel,
    leadsOverTime,
    leadsBySource,
    recentLeads,
    todayAppointments,
    featuredProperties: featuredProperties.map((property) => ({
      ...property,
      image: getMainImage(property),
    })),
    brokerStats,
  };
});

export const getDashboardData: any = _getDashboardData;
