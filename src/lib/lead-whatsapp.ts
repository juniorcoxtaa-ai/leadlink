import { toWhatsappNumber } from "@/lib/phone";

export const LEAD_WHATSAPP_MESSAGE =
  "Olá, {primeiro_nome}! Vi seu interesse pelo atendimento no Lead Link. Posso te ajudar? 😊";

export function buildLeadWhatsappUrl(lead: { name?: string | null; phone?: string | null }) {
  const phone = toWhatsappNumber(lead.phone || "");
  if (!phone) return null;
  const firstName = String(lead.name || "").trim().split(/\s+/)[0] || "tudo bem";
  const text = encodeURIComponent(LEAD_WHATSAPP_MESSAGE.replace("{primeiro_nome}", firstName));
  return `https://wa.me/${phone}?text=${text}`;
}
