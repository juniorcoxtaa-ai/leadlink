import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import {
  uploadPropertyImageServer,
  deletePropertyImageServer,
  getPropertyStorageDiagnostics,
} from "@/lib/property-storage.server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
async function requireSession(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return null;
  }
  return session;
}

export const Route = createFileRoute("/api/property-images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await requireSession(request);
        if (!session) {
          return Response.json({ message: "Não autenticado." }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file");
        const propertyId = String(formData.get("propertyId") ?? "").trim() || null;
        const isPrimary = String(formData.get("isPrimary") ?? "") === "true";
        if (!(file instanceof File)) {
          return Response.json({ message: "Arquivo não enviado." }, { status: 400 });
        }
        if (!file.type.startsWith("image/")) {
          return Response.json({ message: "Envie um arquivo de imagem válido." }, { status: 400 });
        }
        if (file.size > MAX_IMAGE_BYTES) {
          return Response.json(
            { message: "Cada imagem deve ter no máximo 5 MB." },
            { status: 400 },
          );
        }

        try {
          const url = await uploadPropertyImageServer(file, {
            userId: session.user.id,
            propertyId,
            isPrimary,
          });
          return Response.json({ url });
        } catch (error) {
          console.error("[property-images][upload] failed", {
            userId: session.user.id,
            propertyId,
            isPrimary,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            diagnostics: getPropertyStorageDiagnostics(),
            error: error instanceof Error ? error.message : String(error),
          });
          return Response.json(
            { message: error instanceof Error ? error.message : "Falha ao enviar imagem." },
            { status: 500 },
          );
        }
      },
      DELETE: async ({ request }) => {
        const session = await requireSession(request);
        if (!session) {
          return Response.json({ message: "Não autenticado." }, { status: 401 });
        }

        const payload = (await request.json().catch(() => null)) as { url?: string } | null;
        if (payload?.url) {
          await deletePropertyImageServer(payload.url).catch(() => {});
        }
        return Response.json({ ok: true });
      },
    },
  },
});
