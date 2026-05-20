import { createFileRoute } from "@tanstack/react-router";
import { and, asc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { appointments } from "@/db/schema";
import {
  db,
  errorResponse,
  jsonResponse,
  leads,
  optionsResponse,
  requireExtensionSession,
  withExtensionRouteErrorHandling,
} from "./-utils";

const appointmentTypeSchema = z.enum(["retorno", "visita", "ligacao", "reuniao", "proposta"]);

const bodySchema = z.object({
  title: z.string().trim().min(1).max(160),
  type: appointmentTypeSchema,
  leadId: z.string().optional(),
  leadName: z.string().trim().min(1).max(160).optional(),
  propertyId: z.string().optional(),
  propertyTitle: z.string().trim().max(160).optional(),
  date: z.string().datetime(),
  duration: z.number().int().min(5).max(24 * 60).optional(),
  location: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(1000).optional(),
});

function mapAppointment(row: typeof appointments.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    leadId: row.leadId,
    leadName: row.leadName,
    propertyId: row.propertyId,
    propertyTitle: row.propertyTitle,
    brokerId: row.brokerId,
    date: row.date?.toISOString() ?? null,
    duration: row.duration,
    location: row.location,
    status: row.status,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

export const Route = createFileRoute("/api/extension/appointments")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request }) => {
        return withExtensionRouteErrorHandling(request, async () => {
          const auth = await requireExtensionSession(request);
          if (auth.response) return auth.response;

          const rows = await db
            .select()
            .from(appointments)
            .where(and(eq(appointments.brokerId, auth.session.user.id), gte(appointments.date, new Date())))
            .orderBy(asc(appointments.date))
            .limit(10);

          return jsonResponse(request, { appointments: rows.map(mapAppointment) });
        });
      },
      POST: async ({ request }) => {
        return withExtensionRouteErrorHandling(request, async () => {
          const auth = await requireExtensionSession(request);
          if (auth.response) return auth.response;

          let body: z.infer<typeof bodySchema>;
          try {
            body = bodySchema.parse(await request.json());
          } catch {
            return errorResponse(request, 400, "Agendamento invalido.", "invalid_body");
          }

          if (body.leadId) {
            const [lead] = await db
              .select({ id: leads.id, name: leads.name })
              .from(leads)
              .where(and(eq(leads.id, body.leadId), eq(leads.brokerId, auth.session.user.id)))
              .limit(1);

            if (!lead) return errorResponse(request, 404, "Lead nao encontrado.", "not_found");
            if (!body.leadName) body.leadName = lead.name;
          }

          const [created] = await db
            .insert(appointments)
            .values({
              title: body.title,
              type: body.type,
              leadId: body.leadId,
              leadName: body.leadName || "Lead sem nome",
              propertyId: body.propertyId,
              propertyTitle: body.propertyTitle,
              brokerId: auth.session.user.id,
              date: new Date(body.date),
              duration: body.duration ?? 60,
              location: body.location,
              status: "pendente",
            })
            .returning();

          return jsonResponse(request, { appointment: mapAppointment(created) }, 201);
        });
      },
    },
  },
});
