import { createFileRoute } from "@tanstack/react-router";
import { and } from "drizzle-orm";
import { z } from "zod";
import { db, eq, errorResponse, jsonResponse, leads, optionsResponse, requireExtensionSession, withExtensionRouteErrorHandling } from "./-utils";

const messageSchema = z.object({
  from: z.enum(["me", "them"]),
  text: z.string().trim().min(1).max(1200),
  time: z.string().trim().max(40).optional(),
});

const bodySchema = z.object({
  leadId: z.string().trim().optional(),
  messages: z.array(messageSchema).min(1).max(20),
});

const analysisSchema = z.object({
  summary: z.string().trim().min(1).max(600),
  intent: z.string().trim().min(1).max(240),
  temperature: z.enum(["frio", "morno", "quente"]),
  objections: z.array(z.string().trim().min(1).max(240)).max(5),
  nextStep: z.string().trim().min(1).max(300),
  suggestedReplies: z.array(z.string().trim().min(1).max(500)).length(3),
});

type AnalyzeBody = z.infer<typeof bodySchema>;
type ConversationAnalysis = z.infer<typeof analysisSchema>;

const MAX_TOTAL_TEXT = 4500;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function totalTextLength(messages: AnalyzeBody["messages"]) {
  return messages.reduce((sum, message) => sum + message.text.length, 0);
}

function conversationText(messages: AnalyzeBody["messages"]) {
  return messages
    .map((message) => {
      const prefix = message.from === "me" ? "Corretor" : "Lead";
      const time = message.time ? ` (${message.time})` : "";
      return `${prefix}${time}: ${message.text}`;
    })
    .join("\n");
}

function inferTemperature(text: string): ConversationAnalysis["temperature"] {
  if (/(quero|gostei|vamos|agendar|visita|proposta|tenho interesse|pode mandar)/i.test(text)) return "quente";
  if (/(valor|preco|bairro|regiao|financiamento|condominio|metragem|quartos)/i.test(text)) return "morno";
  return "frio";
}

function mockAnalysis(messages: AnalyzeBody["messages"]): ConversationAnalysis {
  const joined = messages.map((message) => message.text).join(" ");
  const lastLeadMessage =
    [...messages].reverse().find((message) => message.from === "them")?.text ||
    "Ainda faltam dados na conversa para entender melhor o que o lead procura.";
  const temperature = inferTemperature(joined);
  const objections = [];

  if (/(valor|preco|caro|orcamento)/i.test(joined)) objections.push("Possivel sensibilidade a preco ou faixa de investimento.");
  if (/(bairro|regiao|localizacao|onde fica)/i.test(joined)) objections.push("Precisa de clareza sobre localizacao ou regiao.");
  if (/(financiamento|entrada|aprovacao)/i.test(joined)) objections.push("Pode haver duvida sobre financiamento ou condicoes de pagamento.");
  if (!objections.length) objections.push("Ainda nao apareceu uma objecao clara; vale fazer uma pergunta aberta para qualificar melhor.");

  const summary =
    temperature === "quente"
      ? "O lead demonstra interesse concreto e esta relativamente perto de avancar, mas ainda precisa de direcionamento seguro."
      : temperature === "morno"
        ? "A conversa mostra interesse real, com sinais de avaliacao e necessidade de mais contexto antes da proxima decisao."
        : "A conversa ainda esta em fase inicial e pede mais qualificacao antes de oferecer opcoes especificas.";

  const intent =
    /(visita|conhecer|ver pessoalmente)/i.test(joined)
      ? "Agendar visita ou avancar para visita."
      : /(comprar|compra|financiamento)/i.test(joined)
        ? "Compra de imovel com necessidade de qualificacao complementar."
        : /(alugar|locacao|aluguel)/i.test(joined)
          ? "Locacao com necessidade de entender perfil ideal."
          : "Entender melhor perfil, momento e criterio de busca do lead.";

  const nextStep =
    temperature === "quente"
      ? "Confirmar criterio principal do lead e convidar para o proximo passo concreto, como envio de opcoes ou visita."
      : "Fazer uma pergunta objetiva para esclarecer perfil, faixa de valor ou regiao antes de sugerir imoveis.";

  const suggestedReplies = [
    "Perfeito! Para eu te indicar algo que faca sentido, me confirma por favor a regiao e a faixa de valor que voce quer manter.",
    "Posso te mandar algumas opcoes alinhadas com o que voce comentou. Antes disso, voce prioriza localizacao, valor ou quantidade de quartos?",
    `Entendi. Pela conversa, meu proximo passo seria te ajudar com mais precisao. Hoje o ponto principal para voce e: ${lastLeadMessage.slice(0, 90)}?`,
  ].map((reply) => reply.slice(0, 500));

  return {
    summary,
    intent,
    temperature,
    objections: objections.slice(0, 3),
    nextStep,
    suggestedReplies,
  };
}

async function analyzeWithOpenAI(messages: AnalyzeBody["messages"], apiKey: string) {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Voce e um copiloto de atendimento imobiliario para corretores. Analise a conversa abaixo e ajude o corretor a responder melhor. Seu objetivo e aumentar clareza, velocidade e conversao, sem perder naturalidade humana. Nao envie mensagem pelo corretor. Nao seja agressivo. Nao prometa disponibilidade de imovel sem confirmacao. Nao invente valores, endereco ou condicao. Retorne somente JSON valido no formato definido.",
        },
        {
          role: "user",
          content: conversationText(messages),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "leadlink_conversation_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "intent", "temperature", "objections", "nextStep", "suggestedReplies"],
            properties: {
              summary: { type: "string" },
              intent: { type: "string" },
              temperature: { type: "string", enum: ["frio", "morno", "quente"] },
              objections: {
                type: "array",
                items: { type: "string" },
                maxItems: 5,
              },
              nextStep: { type: "string" },
              suggestedReplies: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 3,
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`openai_${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("openai_empty");

  return analysisSchema.parse(JSON.parse(content));
}

export const Route = createFileRoute("/api/extension/ai/analyze")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      POST: async ({ request }) => {
        return withExtensionRouteErrorHandling(request, async () => {
          const auth = await requireExtensionSession(request);
          if (auth.response) return auth.response;

          if (auth.session.user.planSlug !== "comercial_ia") {
            return errorResponse(
              request,
              403,
              "IA disponivel no plano Comercial IA.",
              "plan_no_ai",
            );
          }

          let body: AnalyzeBody;
          try {
            body = bodySchema.parse(await request.json());
          } catch {
            return errorResponse(request, 400, "Solicitacao invalida.", "invalid_body");
          }

          if (!body.messages.length) {
            return errorResponse(request, 400, "Envie ao menos uma mensagem para analisar.", "missing_messages");
          }

          if (totalTextLength(body.messages) > MAX_TOTAL_TEXT) {
            return errorResponse(request, 400, "Conversa muito longa para esta analise.", "messages_too_large");
          }

          if (body.leadId) {
            const [lead] = await db
              .select({ id: leads.id })
              .from(leads)
              .where(and(eq(leads.id, body.leadId), eq(leads.brokerId, auth.session.user.id)))
              .limit(1);

            if (!lead) return errorResponse(request, 404, "Lead nao encontrado.", "not_found");
          }

          const apiKey = process.env.OPENAI_API_KEY;

          try {
            const analysis = apiKey
              ? await analyzeWithOpenAI(body.messages, apiKey)
              : mockAnalysis(body.messages);
            return jsonResponse(request, { analysis });
          } catch {
            return jsonResponse(request, { analysis: mockAnalysis(body.messages) });
          }
        });
      },
    },
  },
});
