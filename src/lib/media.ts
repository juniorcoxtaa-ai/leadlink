import { isBase64Image } from "@/lib/property-images";

export function safeSrc(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const src = value.trim();
  if (!src || isBase64Image(src)) return undefined;
  return src;
}
