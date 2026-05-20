import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  activities,
  db,
  eq,
  errorResponse,
  jsonResponse,
  leads,
  optionsResponse,
  requireExtensionSession,
  withExtensionRouteErrorHandling,
} from "./-utils";
import { and } from "drizzle-orm";

const bodySchema = z.object({
  type: z.string().min(1).max(60),
  text: z.string().min(1).max(1000),
});

export const Route = createFileRoute("/api/extension/leads/$id/activity")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      POST: async ({ request, params }) => {
        return withExtensionRouteErrorHandling(request, async () => {
          const auth = await requireExtensionSession(request);
          if (auth.response) return auth.response;

          let body: z.infer<typeof bodySchema>;
          try {
            body = bodySchema.parse(await request.json());
          } catch {
            return errorResponse(request, 400, "Atividade invalida.", "invalid_body");
          }

          const [lead] = await db
            .select({ id: leads.id })
            .from(leads)
            .where(and(eq(leads.id, params.id), eq(leads.brokerId, auth.session.user.id)))
            .limit(1);

          if (!lead) return errorResponse(request, 404, "Lead nao encontrado.", "not_found");

          await db.insert(activities).values({
            leadId: lead.id,
            type: body.type,
            text: body.text,
          });

          return jsonResponse(request, { ok: true });
        });
      },
    },
  },
});
