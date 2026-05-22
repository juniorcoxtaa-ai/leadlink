import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { db } from "@/db";
import { appointments, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

async function requireSession() {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new Error("Não autenticado");
  return session;
}

function isAdminUser(session: Awaited<ReturnType<typeof requireSession>>) {
  return (session.user as { role?: string }).role === "admin";
}

export const getAppointments = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireSession();
  const isAdmin = isAdminUser(session);

  const base = db
    .select({
      id: appointments.id,
      title: appointments.title,
      type: appointments.type,
      leadName: appointments.leadName,
      leadId: appointments.leadId,
      propertyTitle: appointments.propertyTitle,
      propertyId: appointments.propertyId,
      brokerId: appointments.brokerId,
      date: appointments.date,
      duration: appointments.duration,
      location: appointments.location,
      status: appointments.status,
      createdAt: appointments.createdAt,
      brokerName: user.name,
      brokerInitials: user.initials,
    })
    .from(appointments)
    .leftJoin(user, eq(appointments.brokerId, user.id));

  return isAdmin
    ? base.orderBy(appointments.date)
    : base.where(eq(appointments.brokerId, session.user.id)).orderBy(appointments.date);
});

type CreateAppointmentInput = {
  title: string;
  type: string;
  leadName: string;
  leadId?: string;
  propertyTitle?: string;
  propertyId?: string;
  brokerId?: string;
  date: string;
  duration?: number;
  location?: string;
  status?: string;
};

const _createAppointment = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const data = ctx.data as unknown as CreateAppointmentInput;
  const session = await requireSession();
  const isAdmin = isAdminUser(session);
  const brokerId = isAdmin && data.brokerId ? data.brokerId : session.user.id;
  const [appt] = await db
    .insert(appointments)
    .values({ ...data, brokerId, date: new Date(data.date) })
    .returning();
  return appt;
});

export const createAppointment = _createAppointment as unknown as (opts: {
  data: CreateAppointmentInput;
}) => ReturnType<typeof _createAppointment>;

type UpdateAppointmentInput = CreateAppointmentInput & {
  id: string;
};

const _updateAppointment = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const data = ctx.data as unknown as UpdateAppointmentInput;
  const session = await requireSession();
  const isAdmin = isAdminUser(session);
  const [existing] = await db
    .select({ id: appointments.id, brokerId: appointments.brokerId })
    .from(appointments)
    .where(eq(appointments.id, data.id))
    .limit(1);
  if (!existing) throw new Error("Compromisso não encontrado");
  if (!isAdmin && existing.brokerId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  const brokerId = isAdmin && data.brokerId ? data.brokerId : existing.brokerId;
  const [appt] = await db
    .update(appointments)
    .set({
      title: data.title,
      type: data.type,
      leadName: data.leadName,
      leadId: data.leadId,
      propertyTitle: data.propertyTitle,
      propertyId: data.propertyId,
      brokerId,
      date: new Date(data.date),
      duration: data.duration,
      location: data.location,
      status: data.status,
    })
    .where(eq(appointments.id, data.id))
    .returning();
  return appt;
});

export const updateAppointment = _updateAppointment as unknown as (opts: {
  data: UpdateAppointmentInput;
}) => ReturnType<typeof _updateAppointment>;

const _updateAppointmentStatus = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const data = ctx.data as unknown as { id: string; status: string };
  const session = await requireSession();
  const isAdmin = isAdminUser(session);
  const [existing] = await db
    .select({ id: appointments.id, brokerId: appointments.brokerId })
    .from(appointments)
    .where(eq(appointments.id, data.id))
    .limit(1);
  if (!existing) throw new Error("Compromisso não encontrado");
  if (!isAdmin && existing.brokerId !== session.user.id) {
    throw new Error("Unauthorized");
  }
  const [appt] = await db
    .update(appointments)
    .set({ status: data.status })
    .where(eq(appointments.id, data.id))
    .returning();
  return appt;
});

export const updateAppointmentStatus = _updateAppointmentStatus as unknown as (opts: {
  data: { id: string; status: string };
}) => ReturnType<typeof _updateAppointmentStatus>;
