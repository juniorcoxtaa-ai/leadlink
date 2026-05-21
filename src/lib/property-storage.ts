import { getSupabaseBrowserClient } from "@/lib/supabase";

export const PROPERTY_IMAGE_BUCKET = "property-images";
export const PROPERTY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

type UploadOptions = {
  userId: string;
  propertyId?: string | null;
  isPrimary?: boolean;
};

function assertAcceptedImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie um arquivo de imagem válido.");
  }
  if (file.size > PROPERTY_IMAGE_MAX_BYTES) {
    throw new Error("Cada imagem deve ter no máximo 5 MB.");
  }
}

function buildObjectPath(file: File, options: UploadOptions) {
  const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "";
  const safeExt = ext && /^[a-z0-9]+$/i.test(ext) ? ext : "jpg";
  const targetPropertyId = options.propertyId?.trim() || "draft";
  const variant = options.isPrimary ? "cover" : "gallery";
  return `properties/${options.userId}/${targetPropertyId}/${variant}-${crypto.randomUUID()}.${safeExt}`;
}

export async function uploadPropertyImage(file: File, options: UploadOptions): Promise<string> {
  assertAcceptedImage(file);
  const supabase = getSupabaseBrowserClient();
  const objectPath = buildObjectPath(file, options);

  const { error } = await supabase.storage.from(PROPERTY_IMAGE_BUCKET).upload(objectPath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });

  if (error) {
    throw new Error(error.message || "Falha ao enviar imagem para o Supabase Storage.");
  }

  const { data } = supabase.storage.from(PROPERTY_IMAGE_BUCKET).getPublicUrl(objectPath);
  if (!data?.publicUrl) {
    throw new Error("Upload concluído sem URL pública.");
  }

  return data.publicUrl;
}

export async function deletePropertyImageByUrl(url: string): Promise<void> {
  if (!url) return;
  const marker = `/storage/v1/object/public/${PROPERTY_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return;

  const objectPath = url.slice(index + marker.length);
  if (!objectPath) return;

  const supabase = getSupabaseBrowserClient();
  await supabase.storage.from(PROPERTY_IMAGE_BUCKET).remove([objectPath]);
}
