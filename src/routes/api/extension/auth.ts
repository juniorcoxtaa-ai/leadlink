import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, eq, getExtensionUserById, jsonResponse, optionsResponse, sessions, errorResponse, withExtensionRouteErrorHandling } from "./-utils";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const Route = createFileRoute("/api/extension/auth")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      POST: async ({ request }) => {
        return withExtensionRouteErrorHandling(request, async () => {
          let body: z.infer<typeof bodySchema>;
          try {
            body = bodySchema.parse(await request.json());
          } catch {
            return errorResponse(request, 400, "Dados de login invalidos.", "invalid_body");
          }

          let result: Awaited<ReturnType<typeof auth.api.signInEmail>>;
          try {
            const requestUrl = new URL(request.url);
            const authHeaders = new Headers(request.headers);
            authHeaders.set("origin", requestUrl.origin);
            authHeaders.set("host", requestUrl.host);
            result = await auth.api.signInEmail({
              body: { email: body.email, password: body.password, rememberMe: true },
              headers: authHeaders,
            });
          } catch {
            return errorResponse(request, 401, "E-mail ou senha invalidos.", "invalid_credentials");
          }

          const token = result.token;
          const extensionUser = await getExtensionUserById(result.user.id);
          if (!extensionUser) {
            await db.delete(sessions).where(eq(sessions.token, token));
            return errorResponse(
              request,
              403,
              "Seu plano atual nao inclui acesso a extensao.",
              "plan_no_extension",
            );
          }

          return jsonResponse(request, { token, user: extensionUser });
        });
      },
    },
  },
});
