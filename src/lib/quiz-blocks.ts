export type QuizIntent = "locacao" | "compra" | "investimento";

export type QuizQuestionType = "text" | "tel" | "email" | "number" | "select";

export type QuizQuestion = {
  id: string;
  label: string;
  type?: QuizQuestionType;
  placeholder?: string;
  required?: boolean;
  fixed?: boolean;
  options?: string[];
  enabled?: boolean;
};

export type QuizBlock = {
  enabled: boolean;
  questions: QuizQuestion[];
};

export type QuizBlocks = Record<QuizIntent, QuizBlock>;

export const INTENT_QUESTION: QuizQuestion = {
  id: "q-intent",
  label: "O que você está buscando?",
  type: "select",
  required: true,
  enabled: true,
  options: ["Alugar um imóvel", "Comprar um imóvel", "Investir em imóveis"],
};

export const FINAL_QUESTIONS: QuizQuestion[] = [
  { id: "q-name", label: "Nome", type: "text", required: true, enabled: true },
  { id: "q-city", label: "Cidade", type: "text", required: true, enabled: true },
  { id: "q-phone", label: "WhatsApp", type: "tel", required: true, enabled: true },
  { id: "q-terms", label: "Aceite dos termos", type: "select", required: true, enabled: true, options: ["Aceito"] },
];

export const DEFAULT_QUIZ_BLOCKS: QuizBlocks = {
  locacao: {
    enabled: true,
    questions: [
      { id: "q-loc-neighborhood", label: "Qual bairro ou região de preferência?", type: "text", required: true, enabled: true },
      { id: "q-loc-type", label: "Qual tipo de imóvel você busca?", type: "select", required: true, enabled: true, options: ["Apartamento", "Casa", "Kitnet", "Comercial"] },
      { id: "q-loc-bedrooms", label: "Quantos quartos você precisa?", type: "select", required: true, enabled: true, options: ["1", "2", "3", "4+"] },
      { id: "q-loc-rent", label: "Qual valor mensal aproximado de aluguel?", type: "text", required: true, enabled: true },
      { id: "q-loc-timeline", label: "Quando pretende se mudar?", type: "select", required: true, enabled: true, options: ["Imediatamente", "1 a 3 meses", "3 a 6 meses", "Só pesquisando"] },
      { id: "q-loc-pets", label: "Possui pets?", type: "select", required: true, enabled: true, options: ["Sim", "Não"] },
      { id: "q-loc-note", label: "Alguma observação importante?", type: "text", required: false, enabled: true },
    ],
  },
  compra: {
    enabled: true,
    questions: [
      { id: "q-buy-neighborhood", label: "Qual bairro ou região de preferência?", type: "text", required: true, enabled: true },
      { id: "q-buy-type", label: "Qual tipo de imóvel deseja comprar?", type: "select", required: true, enabled: true, options: ["Apartamento", "Casa", "Terreno", "Comercial"] },
      { id: "q-buy-bedrooms", label: "Quantos quartos você procura?", type: "select", required: true, enabled: true, options: ["1", "2", "3", "4+"] },
      { id: "q-buy-budget", label: "Qual valor máximo de compra?", type: "text", required: true, enabled: true },
      { id: "q-buy-finance", label: "Pretende financiar?", type: "select", required: true, enabled: true, options: ["Sim", "Não", "Talvez"] },
      { id: "q-buy-credit", label: "Já possui crédito aprovado ou simulação?", type: "select", required: true, enabled: true, options: ["Sim", "Não", "Estou verificando"] },
      { id: "q-buy-timeline", label: "Qual o prazo para compra?", type: "select", required: true, enabled: true, options: ["Já decidi", "1 a 3 meses", "3 a 6 meses", "Só pesquisando"] },
      { id: "q-buy-note", label: "Alguma observação importante?", type: "text", required: false, enabled: true },
    ],
  },
  investimento: {
    enabled: true,
    questions: [
      { id: "q-inv-region", label: "Qual região ou perfil de oportunidade você prefere?", type: "text", required: true, enabled: true },
      { id: "q-inv-type", label: "Qual tipo de oportunidade procura?", type: "select", required: true, enabled: true, options: ["Apartamento", "Sala comercial", "Terreno", "Lançamento", "Oportunidade abaixo do mercado"] },
      { id: "q-inv-capital", label: "Qual capital disponível para investir?", type: "text", required: true, enabled: true },
      { id: "q-inv-goal", label: "Qual objetivo principal?", type: "select", required: true, enabled: true, options: ["Renda com aluguel", "Valorização", "Revenda rápida", "Diversificação patrimonial"] },
      { id: "q-inv-horizon", label: "Qual horizonte de investimento?", type: "select", required: true, enabled: true, options: ["Curto prazo", "Médio prazo", "Longo prazo"] },
      { id: "q-inv-outside", label: "Aceita oportunidades fora da região principal?", type: "select", required: true, enabled: true, options: ["Sim", "Não", "Depende da oportunidade"] },
      { id: "q-inv-note", label: "Alguma observação importante?", type: "text", required: false, enabled: true },
    ],
  },
};

export function isQuizIntent(value: unknown): value is QuizIntent {
  return value === "locacao" || value === "compra" || value === "investimento";
}

export const ESSENTIAL_QUESTION_IDS = new Set(["q-name", "q-city", "q-phone"]);

export const ESSENTIAL_QUESTIONS: QuizQuestion[] = FINAL_QUESTIONS.filter((q) => q.id !== "q-terms").map((q) => ({ ...q, fixed: true }));

export function sanitizeBlockQuestions(questions: QuizQuestion[] | undefined): QuizQuestion[] {
  return (questions ?? []).filter((q) => !ESSENTIAL_QUESTION_IDS.has(q.id) && q.label.trim().length > 0);
}
