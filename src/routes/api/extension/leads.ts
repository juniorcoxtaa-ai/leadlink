import { createFileRoute } from "@tanstack/react-router";
import { db, desc, eq, jsonResponse, leads, mapLead, optionsResponse, requireExtensionSession, withExtensionRouteErrorHandling } from "./-utils";

export const Route = createFileRoute("/api/extension/leads")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request }) => {
        return withExtensionRouteErrorHandling(request, async () => {
          const auth = await requireExtensionSession(request);
          if (auth.response) return auth.response;

          const rows = await db
            .select()
            .from(leads)
            .where(eq(leads.brokerId, auth.session.user.id))
            .orderBy(desc(leads.createdAt))
            .limit(100);

          return jsonResponse(request, { leads: rows.map((lead) => mapLead(lead)) });
        });
      },
    },
  },
});
