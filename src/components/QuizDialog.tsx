import { useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ACCENT_TOKENS, BTN_RADIUS, type MeuLinkConfig } from "@/lib/meu-link-store";
import { createPublicLead } from "@/server-fns/leads";
import {
  DEFAULT_QUIZ_BLOCKS,
  ESSENTIAL_QUESTIONS,
  FINAL_QUESTIONS,
  INTENT_QUESTION,
  sanitizeBlockQuestions,
  type QuizBlocks,
  type QuizIntent,
  type QuizQuestion,
} from "@/lib/quiz-blocks";
import { buildWhatsappMessage } from "@/lib/whatsapp-message";
import { maskBRL, maskPhoneBR, onlyDigits } from "@/lib/masks";
import { BRAZIL_PHONE_ERROR, toWhatsappNumber, validateBrazilPhone } from "@/lib/phone";
import { openUrlWithFallback } from "@/lib/open-url";
import { trackMetaCustomEvent, trackMetaEvent } from "@/lib/meta-pixel";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cfg: MeuLinkConfig;
  slug: string;
  originPath?: "atendimento" | "vitrine" | "destaque";
  property?: {
    id: string;
    code: string;
    title: string;
    type?: string;
    businessType?: string;
    price?: number;
    neighborhood: string;
    city?: string;
    whatsapp?: string | null;
    phone?: string | null;
  };
};

type Step = QuizQuestion;

const PROPERTY_BUY_QUESTIONS: QuizQuestion[] = [
  {
    id: "q-property-buy-goal",
    label: "Voce pretende comprar para morar ou investir?",
    type: "select",
    required: true,
    enabled: true,
    options: ["Morar", "Investir", "Ainda estou decidindo"],
  },
  {
    id: "q-property-financing-approved",
    label: "Ja possui financiamento aprovado?",
    type: "select",
    required: true,
    enabled: true,
    options: ["Sim", "Nao", "Estou simulando"],
  },
  {
    id: "q-property-down-payment",
    label: "Pretende usar entrada ou FGTS?",
    type: "select",
    required: true,
    enabled: true,
    options: ["Entrada", "FGTS", "Entrada e FGTS", "Nao sei ainda"],
  },
  {
    id: "q-property-closing-time",
    label: "Qual prazo ideal para fechar negocio?",
    type: "select",
    required: true,
    enabled: true,
    options: ["O quanto antes", "Ate 30 dias", "1 a 3 meses", "So pesquisando"],
  },
  {
    id: "q-property-visit",
    label: "Deseja agendar uma visita?",
    type: "select",
    required: true,
    enabled: true,
    options: ["Sim", "Quero combinar horarios", "Ainda nao"],
  },
];

const PROPERTY_RENT_QUESTIONS: QuizQuestion[] = [
  {
    id: "q-property-rent-kind",
    label: "Voce procura locacao anual ou temporada?",
    type: "select",
    required: true,
    enabled: true,
    options: ["Anual", "Temporada", "Ainda estou decidindo"],
  },
  {
    id: "q-property-residents",
    label: "Quantas pessoas vao morar?",
    type: "number",
    required: true,
    enabled: true,
    placeholder: "Ex.: 2",
  },
  {
    id: "q-property-pets",
    label: "Possui pets?",
    type: "select",
    required: true,
    enabled: true,
    options: ["Sim", "Nao"],
  },
  {
    id: "q-property-move-date",
    label: "Qual data deseja entrar no imovel?",
    type: "text",
    required: true,
    enabled: true,
    placeholder: "Ex.: 10/06",
  },
  {
    id: "q-property-visit",
    label: "Deseja agendar uma visita?",
    type: "select",
    required: true,
    enabled: true,
    options: ["Sim", "Quero combinar horarios", "Ainda nao"],
  },
];

const INTENT_MAP: Record<string, QuizIntent> = {
  "Alugar um imóvel": "locacao",
  "Comprar um imóvel": "compra",
  "Investir em imóveis": "investimento",
};

function normalizeQuestion(q: QuizQuestion): QuizQuestion {
  return {
    ...q,
    type: q.type ?? "text",
    enabled: q.enabled ?? true,
  };
}

function buildSteps(blocks: QuizBlocks): Step[] {
  const enabledBlocks = Object.values(blocks).filter((block) => block.enabled);
  if (!enabledBlocks.length) {
    return [
      { id: "q-name", label: "Nome", type: "text", required: true, enabled: true },
      { id: "q-city", label: "Cidade", type: "text", required: true, enabled: true },
      { id: "q-phone", label: "WhatsApp", type: "tel", required: true, enabled: true },
      {
        id: "q-terms",
        label: "Aceite dos termos",
        type: "select",
        required: true,
        enabled: true,
        options: ["Aceito"],
      },
      {
        id: "q-msg",
        label: "Mensagem",
        type: "text",
        required: true,
        enabled: true,
        placeholder: "Como podemos te ajudar?",
      },
    ];
  }
  return [INTENT_QUESTION, ...ESSENTIAL_QUESTIONS, FINAL_QUESTIONS[3]];
}

function buildIntentQuestion(blocks: QuizBlocks): QuizQuestion {
  const options = [
    blocks.locacao.enabled ? "Alugar um imóvel" : null,
    blocks.compra.enabled ? "Comprar um imóvel" : null,
    blocks.investimento.enabled ? "Investir em imóveis" : null,
  ].filter(Boolean) as string[];
  return { ...INTENT_QUESTION, options };
}

function getSelectedIntentQuestions(blocks: QuizBlocks, intentType: QuizIntent | null) {
  if (!intentType) return [];
  return sanitizeBlockQuestions(blocks[intentType].questions).map(normalizeQuestion);
}

function normalizePurpose(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getPropertyIntent(property?: Props["property"]): QuizIntent | null {
  const purpose = normalizePurpose(
    [property?.businessType, property?.type].filter(Boolean).join(" "),
  );
  if (!purpose) return null;
  if (purpose.includes("locacao") || purpose.includes("aluguel") || purpose.includes("temporada")) {
    return "locacao";
  }
  if (purpose.includes("venda")) return "compra";
  return null;
}

function getPropertyQuestions(property?: Props["property"]) {
  const intent = getPropertyIntent(property);
  if (intent === "locacao") return PROPERTY_RENT_QUESTIONS;
  return PROPERTY_BUY_QUESTIONS;
}

function isCurrencyQuestion(question: QuizQuestion | undefined) {
  if (!question) return false;
  return (
    /valor|orcamento|orçamento|capital/i.test(question.label) ||
    /budget|rent|capital/i.test(question.id)
  );
}

export function QuizDialog({ open, onOpenChange, cfg, slug, originPath, property }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [intentType, setIntentType] = useState<QuizIntent | null>(null);

  const accent = ACCENT_TOKENS[cfg.accent];
  const radius = BTN_RADIUS[cfg.btnShape];
  const propertyIntent = getPropertyIntent(property);
  const steps = useMemo(() => {
    if (property) {
      return [...ESSENTIAL_QUESTIONS, ...getPropertyQuestions(property), FINAL_QUESTIONS[3]];
    }
    const blocks = cfg.quizBlocks ?? DEFAULT_QUIZ_BLOCKS;
    const enabledBlocks = Object.values(blocks).filter((block) => block.enabled);
    if (!enabledBlocks.length) return buildSteps(blocks);
    const selected = getSelectedIntentQuestions(blocks, intentType);
    return [buildIntentQuestion(blocks), ...ESSENTIAL_QUESTIONS, ...selected, FINAL_QUESTIONS[3]];
  }, [cfg.quizBlocks, intentType, property]);

  const current = steps[step];
  const progress = steps.length ? Math.round(((step + 1) / steps.length) * 100) : 0;
  const value = current ? (answers[current.id] ?? "") : "";
  const isPhoneStep = current?.id === "q-phone";
  const isCurrencyStep = isCurrencyQuestion(current);
  const inputValue = isPhoneStep ? maskPhoneBR(value) : isCurrencyStep ? maskBRL(value) : value;

  const reset = () => {
    setStep(0);
    setAnswers({});
    setAcceptedTerms(false);
    setSubmitting(false);
    setIntentType(null);
  };

  const next = () => {
    if (!current || submitting) return;
    if (current.id === "q-terms" && !acceptedTerms) {
      toast.error("Aceite os termos para continuar");
      return;
    }
    if (current.required && current.id !== "q-terms" && !value.trim()) {
      toast.error("Esse campo é obrigatório");
      return;
    }
    if (current.id === "q-phone") {
      const phoneCheck = validateBrazilPhone(value);
      if (!phoneCheck.ok) {
        toast.error(phoneCheck.error);
        return;
      }
      setAnswers((a) => ({ ...a, "q-phone": phoneCheck.phone }));
    }
    if (current.id === "q-intent") {
      setIntentType(INTENT_MAP[value] ?? null);
    }
    if (current.id === "q-terms") {
      setAnswers((a) => ({ ...a, "q-terms": acceptedTerms ? "Aceito" : "Não aceito" }));
    }
    if (step + 1 < steps.length) setStep((s) => s + 1);
    else void finish();
  };

  const back = () => {
    if (submitting) return;
    setStep((s) => Math.max(0, s - 1));
  };

  const finish = async () => {
    if (submitting) return;
    const name = (answers["q-name"] ?? "").trim();
    const city = (answers["q-city"] ?? "").trim();
    const phone = (answers["q-phone"] ?? "").trim();
    const message = (answers["q-msg"] ?? "").trim();

    if (!name || !city || !phone) {
      toast.error("Nome, Cidade e WhatsApp são obrigatórios");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Você precisa aceitar os termos para enviar");
      return;
    }

    const leadPhone = validateBrazilPhone(phone);
    if (!leadPhone.ok) {
      toast.error(leadPhone.error);
      return;
    }

    const brokerWhatsapp = toWhatsappNumber(
      property?.whatsapp || property?.phone || cfg.whatsapp || "",
    );
    if (!brokerWhatsapp) {
      toast.error(`WhatsApp do corretor inválido. ${BRAZIL_PHONE_ERROR}`);
      return;
    }

    setSubmitting(true);
    const fullAnswers = {
      ...answers,
      "q-phone": leadPhone.phone,
      "q-terms": acceptedTerms ? "Aceito" : "Nao aceito",
    };
    const propertyUrl =
      property && typeof window !== "undefined" ? window.location.href : undefined;

    const whatsappText = buildWhatsappMessage({
      name,
      city,
      phone: leadPhone.phone,
      intentType: propertyIntent || intentType,
      property: property
        ? {
            title: property.title,
            businessType:
              property.businessType || (propertyIntent === "locacao" ? "Locacao" : "Venda"),
            url: propertyUrl,
          }
        : undefined,
      quizAnswers: fullAnswers,
    });

    try {
      await createPublicLead({
        data: {
          name,
          city,
          phone: leadPhone.phone,
          source: "Meu Link / Quiz",
          originSlug: slug,
          originPath,
          property: property
            ? {
                id: property.id,
                code: property.code,
                title: property.title,
                type: property.type,
                businessType: property.businessType,
                price: property.price,
                neighborhood: property.neighborhood,
                city: property.city,
              }
            : undefined,
          intentType: propertyIntent || intentType || undefined,
          quizAnswers: fullAnswers,
          notes: message || undefined,
        },
      });

      trackMetaEvent("Lead");
      trackMetaCustomEvent("WhatsAppClick", {
        originPath: originPath ?? "atendimento",
        slug,
        propertyId: property?.id ?? null,
      });
      const whatsappUrl = `https://wa.me/${brokerWhatsapp}?text=${whatsappText}`;
      openUrlWithFallback(whatsappUrl);
      onOpenChange(false);
      setTimeout(reset, 300);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar lead");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setTimeout(reset, 300);
      }}
    >
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 gap-0">
        <div
          className="px-6 pt-6 pb-4 text-white"
          style={{
            background: `linear-gradient(135deg, ${accent.bg}, color-mix(in oklab, ${accent.bg} 70%, black))`,
            color: accent.fg,
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">
            Quiz · {cfg.name.split(" ")[0]}
          </div>
          <div className="text-lg font-semibold mt-1 leading-snug">
            {cfg.quizIntro || "Conte o que você procura"}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Progress value={progress} className="h-1.5 bg-white/20" />
            <span className="text-[11px] tabular-nums opacity-90">
              {Math.min(step + 1, steps.length)}/{steps.length}
            </span>
          </div>
        </div>

        <div className="p-6 bg-card">
          {current ? (
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                {current.label}
                {current.required && <span className="text-destructive ml-1">*</span>}
              </Label>

              {current.id === "q-terms" ? (
                <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary/70 to-background p-4 space-y-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald/10 text-emerald flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold">Antes de prosseguir</div>
                      <div className="text-sm text-muted-foreground leading-relaxed mt-1">
                        Seus dados serão utilizados apenas para atendimento imobiliário e contato
                        referente ao imóvel de interesse.
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-pressed={acceptedTerms}
                        onClick={() => setAcceptedTerms((v) => !v)}
                        className="h-5 w-5 rounded-[6px] border-2 flex items-center justify-center transition-all shrink-0"
                        style={{
                          borderColor: acceptedTerms ? accent.bg : "var(--border)",
                          background: acceptedTerms ? accent.bg : "transparent",
                        }}
                        disabled={submitting}
                      >
                        {acceptedTerms && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                      <div className="flex-1 text-sm leading-relaxed">
                        <span>Li e aceito os </span>
                        <button
                          type="button"
                          className="font-medium underline underline-offset-4"
                          onClick={() => setTermsOpen(true)}
                        >
                          Termos de Uso
                        </button>
                        <span> e a </span>
                        <button
                          type="button"
                          className="font-medium underline underline-offset-4"
                          onClick={() => setTermsOpen(true)}
                        >
                          Política de Privacidade
                        </button>
                        <span>.</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : current.type === "select" && current.options ? (
                <div className="grid gap-2">
                  {current.options.map((opt) => {
                    const selected = value === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setAnswers((a) => ({ ...a, [current.id]: opt }))}
                        className="min-h-11 touch-manipulation text-left px-4 py-3 text-sm border-2 transition-all"
                        style={{
                          borderRadius: radius,
                          borderColor: selected ? accent.bg : "var(--border)",
                          background: selected ? accent.soft : "transparent",
                        }}
                        disabled={submitting}
                      >
                        <span className="inline-flex items-center gap-2">
                          {selected && (
                            <Check className="h-3.5 w-3.5" style={{ color: accent.bg }} />
                          )}
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Input
                  type={
                    current.type === "tel" ? "tel" : current.type === "number" ? "number" : "text"
                  }
                  placeholder={current.placeholder}
                  value={inputValue}
                  onChange={(e) => {
                    const nextValue =
                      isPhoneStep || isCurrencyStep ? onlyDigits(e.target.value) : e.target.value;
                    setAnswers((a) => ({ ...a, [current.id]: nextValue }));
                  }}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                  autoFocus
                  disabled={submitting}
                />
              )}

              <div className="flex items-center justify-between pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={back}
                  disabled={step === 0 || submitting}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button
                  type="button"
                  onClick={next}
                  className="text-white shadow-lg shadow-black/10"
                  style={{
                    background: `linear-gradient(135deg, ${accent.bg}, color-mix(in oklab, ${accent.bg} 76%, black))`,
                    color: accent.fg,
                    borderRadius: radius,
                  }}
                  disabled={submitting}
                >
                  {submitting ? (
                    "Salvando..."
                  ) : step + 1 === steps.length ? (
                    <>
                      <MessageCircle className="h-4 w-4 mr-1.5" /> Prosseguir para Atendimento
                    </>
                  ) : (
                    <>
                      Continuar <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-6">
              Nenhuma pergunta ativa.
            </div>
          )}
        </div>
      </DialogContent>
      {termsOpen && <TermsDialog open={termsOpen} onOpenChange={setTermsOpen} />}
    </Dialog>
  );
}

function TermsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <div className="space-y-4">
          <div>
            <div className="text-lg font-semibold">Termos de Uso e Política de Privacidade</div>
            <div className="text-sm text-muted-foreground mt-1">
              Resumo simples sobre como tratamos seus dados para atendimento imobiliário.
            </div>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Coletamos nome, cidade e telefone para organizar o atendimento e retornar sobre o
              imóvel de interesse.
            </p>
            <p>
              Seus dados são usados apenas para contato comercial relacionado ao atendimento
              imobiliário e podem incluir retorno via WhatsApp.
            </p>
            <p>
              Não compartilhamos seus dados de forma indevida com terceiros fora da finalidade do
              atendimento.
            </p>
            <p>Você pode solicitar a exclusão ou atualização dos dados a qualquer momento.</p>
            <p>
              Ao prosseguir, você declara estar ciente e concorda com esse uso para fins de
              atendimento.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
