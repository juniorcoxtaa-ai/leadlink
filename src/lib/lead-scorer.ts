export type QuizIntent = "locacao" | "compra" | "investimento" | null;

export type ScoreResult = {
  score: number;
  classification: "quente" | "morno" | "frio";
  urgency: "imediato" | "curto" | "medio" | "longo" | "exploratorio";
  budgetRange: "economico" | "medio" | "alto" | "premium" | "indefinido";
  scoreDetail: {
    criteria: Array<{ label: string; points: number }>;
  };
  nextStep: string;
  profileSummary: string;
};

const UPPER_PRIORITY = ["imediatamente", "já decidi", "curto prazo"];
const MID_PRIORITY = ["1 a 3 meses", "médio prazo"];
const LOW_PRIORITY = ["3 a 6 meses", "longo prazo"];

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function hasValue(value: unknown) {
  return clean(value).length > 0;
}

function normalizeText(value: unknown) {
  return clean(value).toLowerCase();
}

function parseMoney(value: unknown) {
  const text = clean(value).toLowerCase();
  if (!text) return null;

  const normalized = text
    .replace(/r\$\s?/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const digitMatch = normalized.match(/(\d[\d.,]*)\s*(milh[ãa]o|mil|k)?/i);
  if (!digitMatch) return null;

  const numberPart = digitMatch[1];
  const suffix = (digitMatch[2] || "").toLowerCase();
  const base = Number(
    numberPart.includes(",") && numberPart.includes(".")
      ? numberPart.replace(/\./g, "").replace(",", ".")
      : numberPart.includes(",")
        ? numberPart.replace(",", ".")
        : numberPart.replace(/\./g, "")
  );
  if (!Number.isFinite(base)) return null;

  if (suffix.startsWith("milh")) return base * 1_000_000;
  if (suffix === "mil") return base * 1_000;
  if (suffix === "k") return base * 1_000;
  return base;
}

function bucketBudget(intentType: QuizIntent, quizAnswers: Record<string, unknown>) {
  const values = Object.values(quizAnswers).map(clean).join(" ").toLowerCase();
  const money = Object.values(quizAnswers).map(parseMoney).find((n) => typeof n === "number" && n > 0) ?? null;
  if (intentType === "locacao") {
    const amount = money ?? inferMoney(values);
    if (amount === null) return "indefinido";
    if (amount <= 2500) return "economico";
    if (amount <= 5000) return "medio";
    if (amount <= 9000) return "alto";
    return "premium";
  }
  if (intentType === "compra") {
    const amount = money ?? inferMoney(values);
    if (amount === null) return "indefinido";
    if (amount <= 500000) return "economico";
    if (amount <= 1000000) return "medio";
    if (amount <= 2000000) return "alto";
    return "premium";
  }
  const amount = money ?? inferMoney(values);
  if (amount === null) return "indefinido";
  if (amount <= 500000) return "economico";
  if (amount <= 1000000) return "medio";
  if (amount <= 3000000) return "alto";
  return "premium";
}

function inferMoney(value: string) {
  const match = value.match(/r?\$?\s*([\d.]+(?:,\d{1,2})?)/i);
  if (!match) return null;
  const raw = match[1].replace(/\./g, "").replace(",", ".");
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function urgencyFromAnswers(answers: Record<string, unknown>) {
  const text = Object.values(answers).map(normalizeText).join(" ");
  if (UPPER_PRIORITY.some((t) => text.includes(t))) return "imediato";
  if (MID_PRIORITY.some((t) => text.includes(t))) return "curto";
  if (LOW_PRIORITY.some((t) => text.includes(t))) return "medio";
  if (text.includes("só pesquisando") || text.includes("so pesquisando")) return "exploratorio";
  return "longo";
}

function addScore(criteria: Array<{ label: string; points: number }>, label: string, points: number) {
  criteria.push({ label, points });
  return points;
}

export function scoreLeadAnswers(input: {
  intentType: QuizIntent;
  quizAnswers: Record<string, unknown>;
  notes?: string;
}): ScoreResult {
  const { intentType, quizAnswers, notes } = input;
  const criteria: Array<{ label: string; points: number }> = [];
  let score = 0;

  if (intentType) score += addScore(criteria, "Intenção definida", 20);
  if (hasValue(quizAnswers["q-city"])) score += addScore(criteria, "Cidade informada", 5);
  if (hasValue(quizAnswers["q-phone"])) score += addScore(criteria, "Telefone válido", 10);
  if (normalizeText(quizAnswers["q-terms"]).includes("aceito")) score += addScore(criteria, "Aceite dos termos", 5);
  if (clean(notes).length > 0) score += addScore(criteria, "Observação preenchida", 5);

  const urgency = urgencyFromAnswers(quizAnswers);
  if (urgency === "imediato") score += addScore(criteria, "Urgência imediata", 30);
  if (urgency === "curto") score += addScore(criteria, "Prazo curto", 15);
  if (urgency === "medio") score += addScore(criteria, "Prazo médio", 5);

  const budgetRange = bucketBudget(intentType, quizAnswers);

  if (intentType === "locacao") {
    if (hasValue(quizAnswers["q-loc-rent"])) score += addScore(criteria, "Orçamento mensal informado", 15);
    if (normalizeText(quizAnswers["q-loc-timeline"]).includes("imediatamente")) score += addScore(criteria, "Mudança imediata", 30);
    if (hasValue(quizAnswers["q-loc-pets"])) score += addScore(criteria, "Pets informados", 5);
    if (hasValue(quizAnswers["q-loc-neighborhood"])) score += addScore(criteria, "Região de preferência informada", 5);
  }

  if (intentType === "compra") {
    if (hasValue(quizAnswers["q-buy-budget"])) score += addScore(criteria, "Valor máximo informado", 20);
    if (normalizeText(quizAnswers["q-financing"] ?? quizAnswers["q-buy-finance"]).includes("sim")) score += addScore(criteria, "Financiamento sim", 10);
    if (normalizeText(quizAnswers["q-credit"]).includes("sim")) score += addScore(criteria, "Crédito aprovado/simulação", 20);
    if (normalizeText(quizAnswers["q-buy-timeline"]).includes("já decidi")) score += addScore(criteria, "Prazo definido", 30);
    if (hasValue(quizAnswers["q-buy-neighborhood"])) score += addScore(criteria, "Região de preferência informada", 5);
  }

  if (intentType === "investimento") {
    if (hasValue(quizAnswers["q-invest-capital"])) score += addScore(criteria, "Capital disponível informado", 25);
    if (hasValue(quizAnswers["q-invest-goal"])) score += addScore(criteria, "Objetivo definido", 15);
    if (normalizeText(quizAnswers["q-invest-outside"]).includes("sim")) score += addScore(criteria, "Aceita oportunidades fora da região", 10);
    if (["curto prazo", "médio prazo"].some((t) => normalizeText(quizAnswers["q-invest-horizon"]).includes(t))) score += addScore(criteria, "Horizonte curto/médio", 15);
    if (hasValue(quizAnswers["q-invest-region"])) score += addScore(criteria, "Região/perfil informado", 5);
  }

  const classification = score >= 70 ? "quente" : score >= 40 ? "morno" : "frio";
  const normalizedIntent = intentType || "exploratorio";
  const nextStep =
    classification === "quente" && urgency === "imediato"
      ? "Chamar agora no WhatsApp com opções dentro do perfil informado."
      : classification === "quente" && normalizedIntent === "compra"
        ? "Enviar imóveis compatíveis e tentar agendar visita ainda esta semana."
        : classification === "quente" && normalizedIntent === "investimento"
          ? "Enviar oportunidades com potencial de retorno e marcar conversa consultiva."
          : classification === "morno" && normalizedIntent === "locacao"
            ? "Enviar opções dentro do orçamento e confirmar documentação."
            : classification === "morno" && normalizedIntent === "compra"
              ? "Enviar simulação, opções compatíveis e entender etapa de financiamento."
              : classification === "morno" && normalizedIntent === "investimento"
                ? "Nutrir com oportunidades e explicar potencial de valorização."
                : "Manter em nutrição e coletar mais informações antes de abordagem comercial forte.";

  const profileSummaryParts = [
    intentType ? `Intenção: ${intentType}` : "",
    `Urgência: ${urgency}`,
    `Faixa: ${budgetRange}`,
  ].filter(Boolean);

  return {
    score,
    classification,
    urgency,
    budgetRange,
    scoreDetail: { criteria },
    nextStep,
    profileSummary: profileSummaryParts.join(" · "),
  };
}
