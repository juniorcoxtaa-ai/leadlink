const INTENT_LABELS: Record<string, string> = {
  locacao: "Locacao",
  compra: "Compra",
  investimento: "Investimento",
};

const FRIENDLY_LABELS: Record<string, string> = {
  "q-loc-neighborhood": "Bairro ou regiao de preferencia",
  "q-loc-type": "Tipo de imovel",
  "q-loc-bedrooms": "Quantidade de quartos",
  "q-loc-rent": "Valor mensal aproximado de aluguel",
  "q-loc-timeline": "Prazo para mudanca",
  "q-loc-pets": "Possui pets",
  "q-loc-note": "Observacoes",
  "q-buy-neighborhood": "Bairro ou regiao de preferencia",
  "q-buy-type": "Tipo de imovel",
  "q-buy-bedrooms": "Quantidade de quartos",
  "q-buy-budget": "Valor maximo de compra",
  "q-buy-finance": "Pretende financiar",
  "q-buy-credit": "Credito aprovado ou simulacao",
  "q-buy-timeline": "Prazo para compra",
  "q-buy-note": "Observacoes",
  "q-inv-region": "Regiao ou perfil de oportunidade",
  "q-inv-type": "Tipo de oportunidade",
  "q-inv-capital": "Capital disponivel",
  "q-inv-goal": "Objetivo principal",
  "q-inv-horizon": "Horizonte de investimento",
  "q-inv-outside": "Aceita oportunidades fora da regiao principal",
  "q-inv-note": "Observacoes",
  "q-property-buy-goal": "Compra para morar ou investir",
  "q-property-financing-approved": "Financiamento aprovado",
  "q-property-down-payment": "Entrada ou FGTS",
  "q-property-closing-time": "Prazo ideal para fechar negocio",
  "q-property-visit": "Deseja agendar uma visita",
  "q-property-rent-kind": "Locacao anual ou temporada",
  "q-property-residents": "Quantas pessoas vao morar",
  "q-property-pets": "Possui pets",
  "q-property-move-date": "Data desejada para entrar no imovel",
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function titleFromIntent(intentType: string | null) {
  if (!intentType) return "atendimento";
  return INTENT_LABELS[intentType] || intentType;
}

function answerEntries(quizAnswers: Record<string, unknown>) {
  return Object.entries(quizAnswers).filter(
    ([key, value]) =>
      !["q-name", "q-city", "q-phone", "q-terms", "q-intent"].includes(key) &&
      clean(value).length > 0,
  );
}

export function buildWhatsappMessage(input: {
  name: string;
  city: string;
  phone: string;
  intentType: "locacao" | "compra" | "investimento" | null;
  quizAnswers: Record<string, unknown>;
  property?: {
    title: string;
    businessType?: string | null;
    url?: string;
  };
}) {
  const { name, city, phone, intentType, quizAnswers, property } = input;
  const lines: string[] = [];

  if (property) {
    lines.push("Ola! Tenho interesse neste imovel:");
    lines.push("");
    lines.push(clean(property.title));
    if (clean(property.businessType)) lines.push(`Tipo: ${clean(property.businessType)}`);
    if (clean(property.url)) lines.push(`Link: ${clean(property.url)}`);
    lines.push("");
    lines.push("Minhas respostas:");

    const propertyAnswers = answerEntries(quizAnswers).map(
      ([key, value], index) => `${index + 1}. ${FRIENDLY_LABELS[key] || key}: ${clean(value)}`,
    );

    if (propertyAnswers.length) lines.push(...propertyAnswers);
    lines.push("");
    lines.push("Gostaria de mais informacoes.");
    return encodeURIComponent(lines.join("\n"));
  }

  lines.push(
    `Ola, me chamo ${clean(name)}. Vim pelo seu Link Inteligente e quero atendimento sobre ${titleFromIntent(intentType).toLowerCase()}.`,
  );
  lines.push("");
  lines.push("Resumo do meu perfil:");
  lines.push(`Nome: ${clean(name)}`);
  if (clean(city)) lines.push(`Cidade: ${clean(city)}`);
  if (clean(phone)) lines.push(`Telefone: ${clean(phone)}`);
  if (intentType) lines.push(`Interesse: ${titleFromIntent(intentType)}`);
  lines.push("");

  const prefs = answerEntries(quizAnswers).map(
    ([key, value]) => `* ${FRIENDLY_LABELS[key] || key}: ${clean(value)}`,
  );

  if (prefs.length) {
    lines.push("Preferencias informadas:");
    lines.push("");
    lines.push(...prefs);
    lines.push("");
  }

  lines.push("Pode me ajudar com opcoes dentro desse perfil?");
  return encodeURIComponent(lines.join("\n"));
}
