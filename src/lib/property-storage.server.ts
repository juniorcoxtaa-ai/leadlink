import { randomUUID } from "node:crypto";
import { APP_URL } from "@/config.server";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const PROPERTY_BUCKET = process.env.PROPERTY_IMAGE_BUCKET || "property-images";

function assertStorageConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Storage não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
}

function buildObjectPath(fileName: string) {
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
  return `properties/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
}

function publicUrlFor(path: string) {
  if (!SUPABASE_URL) {
    return new URL(path, APP_URL).toString();
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${PROPERTY_BUCKET}/${path}`;
}

export async function uploadPropertyImageServer(file: File): Promise<string> {
  assertStorageConfigured();
  const objectPath = buildObjectPath(file.name || "image.jpg");
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${PROPERTY_BUCKET}/${objectPath}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "x-upsert": "false",
      "content-type": file.type || "application/octet-stream",
    },
    body: Buffer.from(await file.arrayBuffer()),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Falha no upload da imagem: ${message || response.statusText}`);
  }

  return publicUrlFor(objectPath);
}

export async function deletePropertyImageServer(url: string): Promise<void> {
  assertStorageConfigured();
  const marker = `/storage/v1/object/public/${PROPERTY_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return;
  const objectPath = url.slice(index + marker.length);
  const removeUrl = `${SUPABASE_URL}/storage/v1/object/${PROPERTY_BUCKET}/${objectPath}`;
  await fetch(removeUrl, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
  });
}
