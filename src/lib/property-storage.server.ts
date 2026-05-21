import { randomUUID } from "node:crypto";
import { config as loadDotenv } from "dotenv";
import { APP_URL } from "@/config.server";

loadDotenv();

function getStorageConfig() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  const propertyBucket = process.env.PROPERTY_IMAGE_BUCKET || "property-images";

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    propertyBucket,
  };
}

function assertStorageConfigured() {
  const { supabaseUrl, supabaseServiceRoleKey } = getStorageConfig();
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Storage não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
}

type ServerUploadOptions = {
  userId: string;
  propertyId?: string | null;
  isPrimary?: boolean;
};

function buildObjectPath(fileName: string, options: ServerUploadOptions) {
  const ext = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "jpg";
  const safeExt = ext && /^[a-z0-9]+$/i.test(ext) ? ext : "jpg";
  const propertyId = options.propertyId?.trim() || "draft";
  const variant = options.isPrimary ? "cover" : "gallery";
  return `properties/${options.userId}/${propertyId}/${variant}-${randomUUID()}.${safeExt}`;
}

function publicUrlFor(path: string) {
  const { supabaseUrl, propertyBucket } = getStorageConfig();
  if (!supabaseUrl) {
    return new URL(path, APP_URL).toString();
  }
  return `${supabaseUrl}/storage/v1/object/public/${propertyBucket}/${path}`;
}

export async function uploadPropertyImageServer(
  file: File,
  options: ServerUploadOptions,
): Promise<string> {
  assertStorageConfigured();
  const { supabaseUrl, supabaseServiceRoleKey, propertyBucket } = getStorageConfig();
  const objectPath = buildObjectPath(file.name || "image.jpg", options);
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${propertyBucket}/${objectPath}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${supabaseServiceRoleKey}`,
      apikey: supabaseServiceRoleKey,
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
  const { supabaseUrl, supabaseServiceRoleKey, propertyBucket } = getStorageConfig();
  const marker = `/storage/v1/object/public/${propertyBucket}/`;
  const index = url.indexOf(marker);
  if (index < 0) return;
  const objectPath = url.slice(index + marker.length);
  const removeUrl = `${supabaseUrl}/storage/v1/object/${propertyBucket}/${objectPath}`;
  await fetch(removeUrl, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${supabaseServiceRoleKey}`,
      apikey: supabaseServiceRoleKey,
    },
  });
}

export function getPropertyStorageDiagnostics() {
  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey, propertyBucket } =
    getStorageConfig();

  return {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasPublishableKey: Boolean(supabaseAnonKey),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    usingAnonFallback: !process.env.SUPABASE_SERVICE_ROLE_KEY && Boolean(supabaseServiceRoleKey),
    propertyBucket,
  };
}
