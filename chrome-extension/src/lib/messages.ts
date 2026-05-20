import type { Lead, Property } from "@/lib/api";
import { normalizePhoneDigits, stripBrazilCountryCode } from "@/lib/phone";

export const defaultQuickReplies = [
  "Esse imovel ainda esta disponivel sim. Posso te mandar mais detalhes?",
  "Voce procura para compra ou locacao?",
  "Qual faixa de valor voce pretende investir?",
  "Tem preferencia por bairro ou regiao?",
  "Voce precisa de quantos quartos e vagas?",
  "Posso separar algumas opcoes parecidas com esse perfil.",
  "Quer que eu agende uma visita para voce conhecer?",
  "Esse imovel aceita proposta, posso verificar a margem com o proprietario.",
  "Posso te mandar o link com fotos, valores e localizacao?",
  "Me confirma seu melhor horario para eu te retornar?",
];

export const quickReplies = defaultQuickReplies;

const QUIZ_ANSWER_LABELS: Record<string, string> = {
  "q-name": "Nome",
  "q-phone": "Telefone",
  "q-city": "Cidade",
  "q-terms": "Aceitou os termos?",
  "q-intent": "Interesse",
  "q-loc-city": "Cidade de interesse",
  "q-loc-neighborhood": "Bairro de interesse",
  "q-loc-type": "Tipo de imovel",
  "q-loc-rent": "Valor maximo de aluguel",
  "q-loc-buy": "Valor maximo de compra",
  "q-loc-pets": "Tem pets?",
  "q-bedrooms": "Quartos",
  "q-bathrooms": "Banheiros",
  "q-parking": "Vagas",
  "q-timeline": "Prazo para mudanca/compra",
  "q-budget": "Orcamento",
  "q-financing": "Vai financiar?",
  "q-visit": "Quer agendar visita?",
  "q-message": "Observacoes",
};

function capitalizeWords(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function friendlyQuizLabel(key: string) {
  if (QUIZ_ANSWER_LABELS[key]) return QUIZ_ANSWER_LABELS[key];

  return capitalizeWords(
    key
      .replace(/^q-/, "")
      .replace(/^loc-/, "")
      .replace(/^buy-/, "")
      .replace(/^rent-/, "")
      .replace(/[_-]+/g, " "),
  );
}

export function formatQuizAnswerValue(value: unknown): string {
  if (value == null || value === "") return "Nao informado";
  if (typeof value === "boolean") return value ? "Sim" : "Nao";
  if (Array.isArray(value)) return value.length ? value.map((item) => formatQuizAnswerValue(item)).join(", ") : "Nao informado";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  const text = String(value).trim();
  if (!text) return "Nao informado";
  if (text === "true") return "Sim";
  if (text === "false") return "Nao";
  return text;
}

export function formatDateBR(date: string | null | undefined) {
  if (!date) return "";
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return "";
  return parsed.toLocaleDateString("pt-BR");
}

export function formatRelativeDate(date: string | null | undefined) {
  if (!date) return "";
  const parsed = new Date(date).getTime();
  if (!Number.isFinite(parsed)) return "";
  const diffDays = Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "ha 1 dia";
  return `ha ${diffDays} dias`;
}

export function formatDateTimeBR(date: string | null | undefined) {
  if (!date) return "";
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return "";
  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeDateTime(date: string | null | undefined) {
  if (!date) return "";
  const parsed = new Date(date);
  const time = parsed.getTime();
  if (!Number.isFinite(time)) return "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfTarget) / 86_400_000);
  const hourMinute = parsed.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diffDays === 0) return `hoje ${hourMinute}`;
  if (diffDays === 1) return `ontem ${hourMinute}`;
  return formatDateTimeBR(date);
}

export function leadDisplayDate(lead: Pick<Lead, "createdAt" | "lastContact">) {
  const value = lead.lastContact || lead.createdAt || null;
  return {
    label: lead.lastContact ? "Ultimo contato" : "Criado em",
    date: formatDateBR(value),
    relative: formatRelativeDate(value),
  };
}

export function buildLeadWhatsappUrl(phone: string | null | undefined) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return null;
  const local = stripBrazilCountryCode(digits);
  const normalized = digits.startsWith("55")
    ? digits
    : local.length >= 10 && local.length <= 11
      ? `55${local}`
      : digits;

  if (!/^55\d{10,11}$/.test(normalized)) return null;
  return `https://wa.me/${normalized}`;
}

export function formatCurrency(value: number | null | undefined) {
  if (!value) return "Valor sob consulta";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function buildPropertyPublicLink(property: Pick<Property, "id">, userSlug?: string | null) {
  const baseUrl = import.meta.env.VITE_APP_URL || import.meta.env.VITE_API_URL || "https://www.leadlink.app.br";
  const base = String(baseUrl).replace(/\/$/, "");
  if (userSlug) return `${base}/l/${userSlug}/vitrine/${property.id}`;
  return `${base}/imovel/${property.id}`;
}

export function buildPropertyMessage(input: {
  property: Property;
  leadName?: string | null;
  userSlug?: string | null;
}) {
  const { property, leadName, userSlug } = input;
  const firstName = String(leadName || "").trim().split(/\s+/)[0] || "tudo bem";
  const link = buildPropertyPublicLink(property, userSlug);
  const details = [
    property.bedrooms ? `${property.bedrooms} quarto${property.bedrooms > 1 ? "s" : ""}` : "",
    property.area ? `${property.area}m2` : "",
    property.parking ? `${property.parking} vaga${property.parking > 1 ? "s" : ""}` : "",
  ].filter(Boolean);

  return [
    `Oi ${firstName}! Separei este imovel para voce:`,
    "",
    property.title,
    [property.neighborhood, property.city, property.state].filter(Boolean).join(", "),
    details.length ? details.join(" · ") : "",
    formatCurrency(property.price),
    "",
    link,
  ]
    .filter((line) => line !== "")
    .join("\n");
}
