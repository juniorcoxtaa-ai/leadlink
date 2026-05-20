import { createFileRoute } from "@tanstack/react-router";
import { and } from "drizzle-orm";
import {
  db,
  eq,
  errorResponse,
  getLeadActivity,
  jsonResponse,
  leads,
  mapLead,
  optionsResponse,
  requireExtensionSession,
  withExtensionRouteErrorHandling,
} from "./-utils";

export const Route = createFileRoute("/api/extension/leads/$id")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request, params }) => {
        return withExtensionRouteErrorHandling(request, async () => {
          const auth = await requireExtensionSession(request);
          if (auth.response) return auth.response;

          const [lead] = await db
            .select()
            .from(leads)
            .where(and(eq(leads.id, params.id), eq(leads.brokerId, auth.session.user.id)))
            .limit(1);

          if (!lead) return errorResponse(request, 404, "Lead nao encontrado.", "not_found");

          const activity = await getLeadActivity(lead.id);
          return jsonResponse(request, { lead: mapLead({ ...lead, activity }) });
        });
      },
    },
  },
});
