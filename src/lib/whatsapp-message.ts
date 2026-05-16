const INTENT_LABELS: Record<string, string> = {
  locacao: "Locação",
  compra: "Compra",
  investimento: "Investimento",
};

const FRIENDLY_LABELS: Record<string, string> = {
  "q-loc-neighborhood": "Bairro ou região de preferência",
  "q-loc-type": "Tipo de imóvel",
  "q-loc-bedrooms": "Quantidade de quartos",
  "q-loc-rent": "Valor mensal aproximado de aluguel",
  "q-loc-timeline": "Prazo para mudança",
  "q-loc-pets": "Possui pets",
  "q-loc-note": "Observações",
  "q-buy-neighborhood": "Bairro ou região de preferência",
  "q-buy-type": "Tipo de imóvel",
  "q-buy-bedrooms": "Quantidade de quartos",
  "q-buy-budget": "Valor máximo de compra",
  "q-financing": "Pretende financiar",
  "q-credit": "Crédito aprovado ou simulação",
  "q-buy-timeline": "Prazo para compra",
  "q-buy-note": "Observações",
  "q-invest-region": "Região ou perfil de oportunidade",
  "q-invest-type": "Tipo de oportunidade",
  "q-invest-capital": "Capital disponível",
  "q-invest-goal": "Objetivo principal",
  "q-invest-horizon": "Horizonte de investimento",
  "q-invest-outside": "Aceita oportunidades fora da região principal",
  "q-invest-note": "Observações",
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function titleFromIntent(intentType: string | null) {
  if (!intentType) return "atendimento";
  return INTENT_LABELS[intentType] || intentType;
}

export function buildWhatsappMessage(input: {
  name: string;
  city: string;
  phone: string;
  intentType: "locacao" | "compra" | "investimento" | null;
  quizAnswers: Record<string, unknown>;
}) {
  const { name, city, phone, intentType, quizAnswers } = input;
  const lines: string[] = [];
  lines.push(`Olá, me chamo ${clean(name)}. Vim pelo seu Link Inteligente e quero atendimento sobre ${titleFromIntent(intentType).toLowerCase()}.`);
  lines.push("");
  lines.push("Resumo do meu perfil:");
  lines.push(`Nome: ${clean(name)}`);
  if (clean(city)) lines.push(`Cidade: ${clean(city)}`);
  if (clean(phone)) lines.push(`Telefone: ${clean(phone)}`);
  if (intentType) lines.push(`Interesse: ${titleFromIntent(intentType)}`);
  lines.push("");
  const prefs = Object.entries(quizAnswers)
    .filter(([key, value]) => !["q-name", "q-city", "q-phone", "q-terms"].includes(key) && clean(value).length > 0)
    .map(([key, value]) => `* ${FRIENDLY_LABELS[key] || key}: ${clean(value)}`);

  if (prefs.length) {
    lines.push("Preferências informadas:");
    lines.push("");
    lines.push(...prefs);
    lines.push("");
  }

  lines.push("Pode me ajudar com opções dentro desse perfil?");
  return encodeURIComponent(lines.join("\n"));
}
