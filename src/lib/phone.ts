export const BRAZIL_PHONE_ERROR =
  "Informe um WhatsApp válido com DDD. Ex.: (11) 99999-0000";

export type BrazilPhoneValidation =
  | { ok: true; digits: string; phone: string }
  | { ok: false; digits: string; phone: null; error: string };

export function validateBrazilPhone(input: string): BrazilPhoneValidation {
  const digits = String(input ?? "").replace(/\D/g, "");

  if (digits.length === 10 || digits.length === 11) {
    return { ok: true, digits, phone: `55${digits}` };
  }

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return { ok: true, digits, phone: digits };
  }

  return { ok: false, digits, phone: null, error: BRAZIL_PHONE_ERROR };
}

export function toWhatsappNumber(phone: string): string | null {
  const result = validateBrazilPhone(phone);
  return result.ok ? result.phone : null;
}
