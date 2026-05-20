export function normalizePhone(input: string | null | undefined) {
  return String(input ?? "").replace(/\D/g, "");
}

export function normalizePhoneDigits(phone: string | null | undefined) {
  return normalizePhone(phone);
}

export function stripBrazilCountryCode(phone: string | null | undefined) {
  const digits = normalizePhoneDigits(phone);
  return digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits;
}

function addVariant(variants: Set<string>, value: string) {
  if (value.length >= 10) variants.add(value);
}

function canonicalLocalVariants(phone: string | null | undefined) {
  const local = stripBrazilCountryCode(phone);
  const variants = new Set<string>();
  if (local.length >= 10 && local.length <= 11) variants.add(local);

  if (local.length === 10) {
    variants.add(`${local.slice(0, 2)}9${local.slice(2)}`);
  }

  if (local.length === 11 && local[2] === "9") {
    variants.add(`${local.slice(0, 2)}${local.slice(3)}`);
  }

  return variants;
}

function addSuffixes(variants: Set<string>, value: string) {
  for (const length of [8, 9, 10, 11]) {
    if (value.length >= length) variants.add(value.slice(-length));
  }
}

export function possiblePhoneVariants(input: string | null | undefined) {
  const digits = normalizePhoneDigits(input);
  const variants = new Set<string>();

  if (digits.length >= 10) addVariant(variants, digits);
  for (const local of canonicalLocalVariants(digits)) {
    addVariant(variants, local);
    addVariant(variants, `55${local}`);
  }

  for (const variant of Array.from(variants)) addSuffixes(variants, variant);

  return Array.from(variants);
}

export function matchBrazilianPhones(a: string | null | undefined, b: string | null | undefined) {
  const leftDigits = normalizePhoneDigits(a);
  const rightDigits = normalizePhoneDigits(b);
  if (leftDigits.length < 10 || rightDigits.length < 10) return false;

  const left = canonicalLocalVariants(leftDigits);
  const right = canonicalLocalVariants(rightDigits);
  for (const variant of right) {
    if (left.has(variant)) return true;
  }
  return false;
}

export function phoneVariants(input: string | null | undefined) {
  return possiblePhoneVariants(input);
}

export function matchPhones(a: string | null | undefined, b: string | null | undefined) {
  return matchBrazilianPhones(a, b);
}

export function formatPhone(input: string | null | undefined) {
  const digits = stripBrazilCountryCode(normalizePhone(input));
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return input ? String(input) : "";
}
