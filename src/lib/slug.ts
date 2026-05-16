const RESERVED = new Set([
  "admin",
  "api",
  "login",
  "register",
  "dashboard",
  "vitrine",
  "quiz",
  "leads",
  "imoveis",
  "imóveis",
  "l",
  "meu-link",
  "links",
  "planos",
  "financeiro",
]);

export function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function generateSlugFromName(name: string) {
  return normalizeSlug(name).slice(0, 60);
}

export function isReservedSlug(slug: string) {
  return RESERVED.has(slug);
}

export function validateSlug(slug: string) {
  const normalized = normalizeSlug(slug);
  if (normalized.length < 3 || normalized.length > 60) {
    return { ok: false as const, slug: normalized, reason: "length" as const, message: "Slug deve ter entre 3 e 60 caracteres." };
  }
  if (!/^[a-z0-9-]+$/.test(normalized)) {
    return { ok: false as const, slug: normalized, reason: "format" as const, message: "Slug pode conter apenas letras, números e hífen." };
  }
  if (isReservedSlug(normalized)) {
    return { ok: false as const, slug: normalized, reason: "reserved" as const, message: "Este slug é reservado." };
  }
  return { ok: true as const, slug: normalized };
}
