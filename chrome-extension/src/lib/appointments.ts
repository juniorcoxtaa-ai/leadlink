import type { Appointment, AppointmentType, Lead } from "@/lib/api";
import { formatRelativeDateTime, formatDateTimeBR } from "@/lib/messages";

export type AppointmentDraft = {
  type: AppointmentType;
  title: string;
  leadId?: string;
  leadName?: string;
};

export function appointmentTypeLabel(type: AppointmentType) {
  const labels: Record<AppointmentType, string> = {
    retorno: "Retorno",
    visita: "Visita",
    ligacao: "Ligacao",
    reuniao: "Reuniao",
    proposta: "Proposta",
  };
  return labels[type];
}

export function appointmentDateText(date: string) {
  return formatRelativeDateTime(date) || formatDateTimeBR(date);
}

export function validateAppointmentForm(input: { title: string; date: string; time: string }) {
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "missing_title" };
  if (!input.date || !input.time) return { ok: false as const, error: "missing_datetime" };
  return { ok: true as const };
}

export function buildAppointmentPayload(input: {
  title: string;
  type: AppointmentType;
  date: string;
  time: string;
  notes?: string;
  propertyId?: string;
  propertyTitle?: string;
  currentLead?: Lead | null;
  draft?: AppointmentDraft | null;
}) {
  return {
    title: input.title.trim(),
    type: input.type,
    leadId: input.currentLead?.id || input.draft?.leadId,
    leadName: input.currentLead?.name || input.draft?.leadName,
    propertyId: input.propertyId || undefined,
    propertyTitle: input.propertyTitle?.trim() || undefined,
    date: new Date(`${input.date}T${input.time}:00`).toISOString(),
    notes: input.notes?.trim() || undefined,
  };
}

export function buildAppointmentActivity(appointment: Appointment) {
  if (!appointment.leadId || !appointment.date) return null;
  return {
    leadId: appointment.leadId,
    type: "extension_appointment_created",
    text: `Agendamento criado: ${appointmentTypeLabel(appointment.type)} em ${appointmentDateText(appointment.date)}`,
  };
}

export function buildScheduleDraft(type: AppointmentType, lead: Pick<Lead, "id" | "name">): AppointmentDraft {
  return {
    type,
    title: `${appointmentTypeLabel(type)} com ${lead.name}`,
    leadId: lead.id,
    leadName: lead.name,
  };
}
