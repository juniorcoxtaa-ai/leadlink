import {
  db,
  desc,
  eq,
  jsonResponse,
  mapProperty,
  optionsResponse,
  properties,
  requireExtensionSession,
  withExtensionRouteErrorHandling,
} from "./-utils";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/extension/properties")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request }) => {
        return withExtensionRouteErrorHandling(request, async () => {
          const auth = await requireExtensionSession(request);
          if (auth.response) return auth.response;

          const rows = await db
            .select()
            .from(properties)
            .where(eq(properties.brokerId, auth.session.user.id))
            .orderBy(desc(properties.createdAt));

          return jsonResponse(request, { properties: rows.map((property) => mapProperty(property)) });
        });
      },
    },
  },
});
