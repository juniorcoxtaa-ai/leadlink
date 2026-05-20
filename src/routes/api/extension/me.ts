import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, optionsResponse, requireExtensionSession, withExtensionRouteErrorHandling } from "./-utils";

export const Route = createFileRoute("/api/extension/me")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request }) => {
        return withExtensionRouteErrorHandling(request, async () => {
          const auth = await requireExtensionSession(request);
          if (auth.response) return auth.response;
          return jsonResponse(request, { user: auth.session.user });
        });
      },
    },
  },
});
