const PROPERTY_UPLOAD_ENDPOINT = "/api/property-images";

export async function uploadPropertyImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch(PROPERTY_UPLOAD_ENDPOINT, {
    method: "POST",
    body,
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message || "Falha ao enviar imagem para o storage.");
  }

  const payload = (await response.json()) as { url: string };
  if (!payload?.url) {
    throw new Error("Upload concluído sem URL pública.");
  }

  return payload.url;
}

export async function deletePropertyImage(url: string): Promise<void> {
  await fetch(PROPERTY_UPLOAD_ENDPOINT, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
    credentials: "include",
  });
}

export function resolveStoragePublicUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const base =
    typeof window !== "undefined" ? window.location.origin : process.env.APP_URL || "http://localhost:3000";
  return new URL(path, base).toString();
}
