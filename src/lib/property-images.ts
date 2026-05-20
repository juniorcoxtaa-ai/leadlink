const DATA_IMAGE_PREFIX = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i;

export const MAX_INLINE_IMAGE_BYTES = 8 * 1024;

export type PropertyLike = {
  id?: string;
  code?: string | null;
  title?: string | null;
  type?: string | null;
  businessType?: string | null;
  status?: string | null;
  price?: number | null;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: number | null;
  neighborhood?: string | null;
  city?: string | null;
  image?: unknown;
  images?: unknown;
};

export function isBase64Image(value: unknown): value is string {
  return typeof value === "string" && DATA_IMAGE_PREFIX.test(value.trim());
}

export function estimateBase64ImageBytes(value: string): number {
  const trimmed = value.trim();
  const payload = trimmed.replace(DATA_IMAGE_PREFIX, "");
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

export function assertNoLargeBase64Image(value: unknown, field = "image"): void {
  if (!isBase64Image(value)) return;
  const size = estimateBase64ImageBytes(value);
  if (size > MAX_INLINE_IMAGE_BYTES) {
    throw new Error(
      `${field} contém base64 grande (${Math.round(size / 1024)} KB). Faça upload para o storage antes de salvar.`,
    );
  }
}

export function normalizePropertyImages(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getMainImage(property: Pick<PropertyLike, "image" | "images">): string | null {
  const image = typeof property.image === "string" ? property.image.trim() : "";
  if (image && !isBase64Image(image)) return image;

  for (const candidate of normalizePropertyImages(property.images)) {
    if (!isBase64Image(candidate)) return candidate;
  }

  return null;
}

export function normalizePropertyImagePayload(input: { image?: unknown; images?: unknown }) {
  const image = typeof input.image === "string" ? input.image.trim() : "";
  const images = normalizePropertyImages(input.images);

  assertNoLargeBase64Image(image, "image");
  +images.forEach((value, index) => assertNoLargeBase64Image(value, `images[${index}]`));

  const filteredImages = images.filter((value) => !isBase64Image(value));
  const mainImage = image && !isBase64Image(image) ? image : (filteredImages[0] ?? null);
  const dedupedGallery = Array.from(new Set(filteredImages.filter((value) => value !== mainImage)));

  return {
    image: mainImage,
    images: dedupedGallery,
  };
}

export function sanitizePropertyListItem<T extends PropertyLike>(property: T) {
  return {
    id: property.id ?? "",
    title: property.title ?? "",
    businessType: property.businessType ?? null,
    price: property.price ?? 0,
    city: property.city ?? null,
    neighborhood: property.neighborhood ?? null,
    bedrooms: property.bedrooms ?? 0,
    bathrooms: property.bathrooms ?? 0,
    parking: property.parking ?? 0,
    area: property.area ?? 0,
    mainImage: getMainImage(property),
    image: getMainImage(property),
    status: property.status ?? null,
    type: property.type ?? null,
    code: property.code ?? null,
  };
}
