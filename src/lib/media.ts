export function safeSrc(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const src = value.trim();
  return src.length > 0 ? src : undefined;
}
