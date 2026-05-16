import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Send,
  MessageSquarePlus,
  CheckCheck,
  Lock,
} from "lucide-react";

const ANSWER_LABELS: Record<string, string> = {
  "q-name": "Nome",
  "q-phone": "Telefone",
  "q-intent": "O que você está buscando?",
  "q-city": "Qual cidade ou bairro você procura?",
  "q-property-type": "Qual tipo de imóvel você busca?",
  "q-bedrooms": "Quantos quartos você precisa?",
  "q-rent-budget": "Qual valor mensal aproximado de aluguel?",
  "q-move-time": "Quando pretende se mudar?",
  "q-pets": "Possui pets?",
  "q-observation": "Alguma observação importante?",
  "q-buy-type": "Qual tipo de imóvel deseja comprar?",
  "q-buy-bedrooms": "Quantos quartos você procura?",
  "q-buy-budget": "Qual valor máximo de compra?",
  "q-financing": "Pretende financiar?",
  "q-credit": "Já possui crédito aprovado ou simulação?",
  "q-buy-timeline": "Qual o prazo para compra?",
  "q-invest-region": "Qual cidade ou região de interesse?",
  "q-invest-type": "Qual tipo de oportunidade procura?",
  "q-invest-capital": "Qual capital disponível para investir?",
  "q-invest-goal": "Qual objetivo principal?",
  "q-invest-horizon": "Qual horizonte de investimento?",
  "q-invest-outside": "Aceita oportunidades fora da região principal?",
  "q-interest": "Interesse",
  "q-budget": "Orçamento",
  "q-region": "Cidade/região",
  "q-timeline-buy": "Prazo",
};
import { UpgradeModal } from "@/components/UpgradeCTA";
import { STATUS_LABEL } from "@/lib/lead-constants";
import { scoreColor, statusBadgeClass } from "@/lib/status";
import { toast } from "sonner";
import {
  getLead,
  getBrokers,
  updateLeadStatus,
  updateLeadNotes,
  addChatMessage,
  updateLeadBroker,
} from "@/server-fns/leads";

export const Route = createFileRoute("/_app/leads/$leadId")({
  head: () => ({ meta: [{ title: `Lead — Leadlink` }] }),
  loader: async ({ params }) => ({
    lead: await getLead({ data: params.leadId }),
    brokers: await getBrokers(),
  }),
  component: LeadDetail,
});

function LeadDetail() {
  const { lead: leadOrNull, brokers } = Route.useLoaderData() as {
    lead: Awaited<ReturnType<typeof getLead>>;
    brokers: Awaited<ReturnType<typeof getBrokers>>;
  };
  const router = useRouter();

  if (!leadOrNull) throw notFound();
  const lead = leadOrNull;
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(() => {
    const n = lead.notes || "";
    return n.trim().startsWith("{") ? "" : n;
  });
  const [msg, setMsg] = useState("");
  const [chatMsgs, setChatMsgs] = useState(lead.chat);

  const isBlocked = normalizeBlocked(lead.isBlocked);

  if (isBlocked) {
    return (
      <div className="space-y-5 max-w-[1500px] mx-auto">
        <Link to="/leads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para Leads
        </Link>

        <Card className="p-6 border-amber-500/30 bg-amber-500/5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">Lead bloqueado no Free</div>
              <div className="text-sm text-muted-foreground">
                Este lead foi capturado, mas os dados completos ficam disponíveis só no Pro ou no Comercial IA.
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Field label="Score" value={lead.score != null ? String(lead.score) : "Não informado"} />
            <Field label="Classificação" value={lead.classification || "Não informado"} />
            <Field label="Intenção" value={formatIntent(lead.intentType)} />
            <Field label="Próximo passo" value={lead.nextStep || "Não informado"} />
            <Field label="Resumo do perfil" value={lead.profileSummary || "Não informado"} />
          </div>
        </Card>

        <UpgradeModal
          open
          onOpenChange={(open) => {
            if (!open) router.navigate({ to: "/leads" });
          }}
          title="Desbloqueie este lead"
          description="No Free, apenas os 15 primeiros leads ficam completos. Faça upgrade para ver contatos, respostas do quiz, score e o próximo passo recomendado."
          benefits={[
            "Leads ilimitados",
            "Imóveis ilimitados e mais organização",
            "A imagem de fundo do Meu Link",
            "Edição avançada do Quiz",
            "Vídeos do Meu Link",
          ]}
          primaryLabel="Ver planos"
          secondaryLabel="Voltar para Leads"
          onPrimary={() => router.navigate({ to: "/planos" })}
        />
      </div>
    );
  }

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    try {
      await updateLeadStatus({ data: { id: lead.id, status: newStatus } });
      toast.success("Status atualizado");
      router.invalidate();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  }

  async function handleSaveNotes() {
    try {
      await updateLeadNotes({ data: { id: lead.id, notes } });
      toast.success("Anotações salvas");
    } catch {
      toast.error("Erro ao salvar anotações");
    }
  }

  async function handleSendMsg() {
    if (!msg.trim()) return;
    try {
      const newMsg = await addChatMessage({ data: { leadId: lead.id, from: "broker", text: msg } });
      setChatMsgs((prev: typeof chatMsgs) => [...prev, newMsg]);
      setMsg("");
      toast.success("Mensagem enviada");
    } catch {
      toast.error("Erro ao enviar mensagem");
    }
  }

  const brokerInitials =
    lead.brokerInitials ||
    lead.brokerName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?";
  const brokerOptions = brokers.filter((b) => b.role === "admin" || b.role === "corretor");
  const lastContactLabel = lead.lastContact
    ? new Date(lead.lastContact).toLocaleString("pt-BR")
    : "Não informado";
  const createdLabel = new Date(lead.createdAt).toLocaleString("pt-BR");
  const notesPreview = getReadableNotes(lead.notes, lead.profileSummary);

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      <Link to="/leads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para Leads
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-gradient-to-br from-navy to-navy/70 text-navy-foreground text-lg font-semibold">
                  {lead.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold truncate">{lead.name}</h2>
                  <Badge variant="outline" className={`font-mono ${scoreColor(lead.score)}`}>Score {lead.score}</Badge>
                  <Badge variant="outline" className="text-[10px]">{formatIntent(lead.intentType)}</Badge>
                  <Badge variant="outline" className={`text-[10px] font-mono ${classificationBadgeClass(lead.classification)}`}>
                    {lead.classification || "frio"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">{lead.interest}</div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {lead.phone}</span>
                  {lead.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {lead.email}</span>}
                  {lead.region && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {lead.region}</span>}
                </div>
              </div>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as string[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s as keyof typeof STATUS_LABEL]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border">
              <Field label="Origem" value={lead.source || "Não informado"} />
              <Field label="Status" value={STATUS_LABEL[lead.status as keyof typeof STATUS_LABEL] || lead.status || "Não informado"} />
              <Field label="Criado em" value={createdLabel} />
              <Field label="Último contato" value={lastContactLabel} />
            </div>

            <div className="grid md:grid-cols-2 gap-3 mt-6">
              <Field label="Tipo de intenção" value={formatIntent(lead.intentType)} />
              <Field label="Classificação" value={lead.classification || "Não informado"} />
              <Field label="Score" value={String(lead.score ?? "Não informado")} />
              <Field label="Próximo passo" value={lead.nextStep || "Não informado"} />
              <Field label="Resumo do perfil" value={lead.profileSummary || "Não informado"} />
              <Field label="Interesse" value={lead.interest || "Não informado"} />
              <Field label="Orçamento" value={lead.budget || "Não informado"} />
              <Field label="Prazo / timeline" value={lead.timeline || "Não informado"} />
            </div>
          </Card>

          {lead.quizAnswers && Object.keys(lead.quizAnswers).length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Respostas do Quiz</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {Object.entries(lead.quizAnswers as Record<string, unknown>)
                  .filter(([, v]) => v != null && String(v).trim() !== "")
                  .map(([key, value]) => (
                    <Field
                      key={key}
                      label={ANSWER_LABELS[key] || key}
                      value={String(value)}
                    />
                  ))}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Linha do tempo</h3>
            </div>
            <div className="relative pl-6 space-y-5">
              <div className="absolute left-2 top-1.5 bottom-1.5 w-px bg-border" />
              {lead.activity.map((a: any) => (
                <div key={a.id} className="relative">
                  <div className="absolute -left-[18px] top-1 h-3 w-3 rounded-full bg-gold ring-4 ring-background" />
                  <div className="text-sm font-medium">{a.text}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(a.createdAt).toLocaleString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Anotações</h3>
              <Button size="sm" variant="outline" onClick={handleSaveNotes}>
                <MessageSquarePlus className="h-4 w-4 mr-1" /> Salvar
              </Button>
            </div>
            <div className="mb-4 rounded-lg border border-border bg-card p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Resumo do lead
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium">Intenção</div>
                  <div className="text-muted-foreground">{formatIntent(lead.intentType)}</div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium">Classificação</div>
                  <div className="text-muted-foreground">{lead.classification || "Não informado"}</div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium">Próximo passo</div>
                  <div className="text-muted-foreground">{lead.nextStep || "Não informado"}</div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium">Resumo do perfil</div>
                  <div className="text-muted-foreground">{lead.profileSummary || "Não informado"}</div>
                </div>
              </div>
            </div>
            <div className="mb-3 rounded-lg border border-border bg-secondary/30 p-3 text-sm whitespace-pre-wrap text-foreground/90">
              {notesPreview}
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[110px] resize-none"
              placeholder="Adicione anotações sobre este lead..."
            />
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Corretor responsável</div>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-navy text-navy-foreground font-semibold">{brokerInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{lead.brokerName || "Sem corretor"}</div>
                <div className="text-xs text-muted-foreground truncate">{lead.brokerEmail}</div>
              </div>
              <Select
                value={lead.brokerId ?? "unassigned"}
                onValueChange={async (brokerId) => {
                  const nextBrokerId = brokerId === "unassigned" ? null : brokerId;
                  try {
                    await updateLeadBroker({ data: { id: lead.id, brokerId: nextBrokerId } });
                    toast.success("Corretor atualizado");
                    router.invalidate();
                  } catch {
                    toast.error("Erro ao reatribuir lead");
                  }
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Reatribuir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Sem corretor</SelectItem>
                  {brokerOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3">
              <Badge className={statusBadgeClass(status)}>
                {STATUS_LABEL[status as keyof typeof STATUS_LABEL] || status}
              </Badge>
            </div>
          </Card>

          <Card className="flex flex-col h-[560px]">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <div className="font-semibold text-sm">Conversa WhatsApp</div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> Online
                </div>
              </div>
              <Select defaultValue="t1">
                <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="t1">Primeiro contato</SelectItem>
                  <SelectItem value="t2">Reengajamento</SelectItem>
                  <SelectItem value="t3">Confirmação visita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/30">
              {chatMsgs.map((m: any) => (
                <div key={m.id} className={`flex ${m.from === "broker" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                      m.from === "broker"
                        ? "bg-gold text-navy rounded-br-sm"
                        : "bg-card border border-border rounded-bl-sm"
                    }`}
                  >
                    <div>{m.text}</div>
                    <div className={`text-[10px] mt-1 inline-flex items-center gap-1 ${m.from === "broker" ? "text-navy/60" : "text-muted-foreground"}`}>
                      {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {m.from === "broker" && <CheckCheck className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border flex items-center gap-2">
              <Input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Digite uma mensagem..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMsg();
                  }
                }}
              />
              <Button size="icon" className="bg-gold text-navy hover:bg-gold/90" onClick={handleSendMsg}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}

function formatIntent(intent?: string | null) {
  switch (intent) {
    case "locacao":
      return "Locação";
    case "compra":
      return "Compra";
    case "investimento":
      return "Investimento";
    default:
      return "Não informado";
  }
}

function classificationBadgeClass(classification?: string | null) {
  const value = (classification || "frio").toLowerCase();
  if (value.includes("quente")) return "bg-emerald/10 text-emerald border-emerald/20";
  if (value.includes("morno")) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "bg-secondary text-secondary-foreground";
}

function normalizeBlocked(value: unknown) {
  if (value === true) return true;
  if (value === false || value == null) return false;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return Boolean(value);
}

function getReadableNotes(notes?: string | null, fallback?: string | null) {
  if (!notes) return fallback?.trim() || "Não informado";
  const trimmed = notes.trim();
  if (!trimmed) return fallback?.trim() || "Não informado";
  if (!trimmed.startsWith("{")) return trimmed;

  try {
    const parsed = JSON.parse(trimmed) as {
      summary?: unknown;
      profileSummary?: unknown;
      nextStep?: unknown;
      intentType?: unknown;
    };
    const parts = [
      typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      typeof parsed.profileSummary === "string" ? parsed.profileSummary.trim() : "",
      typeof parsed.nextStep === "string" ? parsed.nextStep.trim() : "",
    ].filter(Boolean);
    if (parts.length > 0) return parts.join("\n\n");
  } catch {
    return fallback?.trim() || "Informações estruturadas registradas.";
  }

  return fallback?.trim() || "Informações estruturadas registradas.";
}
