import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import {
  ArrowRight,
  Check,
  Chrome,
  Lock,
  MessageCircle,
  Sparkles,
  Zap,
  BarChart3,
  Users,
  Brain,
  Bot,
  FileText,
  Calendar,
  Shield,
  Puzzle,
} from "lucide-react";

export const Route = createFileRoute("/_app/extensao")({
  head: () => ({ meta: [{ title: "Extensão Atendimento — Leadlink" }] }),
  component: ExtensaoPage,
});

function ExtensaoPage() {
  const plan = usePlanLimits();
  const isFree = plan.isFree;
  const isCommercial = plan.isComercialIa;
  const isPro = plan.isPro;
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);

  const proFeatures = [
    {
      icon: MessageCircle,
      title: "Painel lateral no WhatsApp Web",
      desc: "Atendimento sem sair da conversa.",
    },
    {
      icon: FileText,
      title: "Histórico do lead",
      desc: "Veja tudo que já foi capturado e atendido.",
    },
    {
      icon: BarChart3,
      title: "Score visível",
      desc: "Priorize quem tem maior potencial de conversão.",
    },
    { icon: Sparkles, title: "Templates rápidos", desc: "Envie mensagens prontas em segundos." },
    {
      icon: Users,
      title: "Sincronização com o CRM",
      desc: "Tudo continua organizado no Lead Link.",
    },
  ];

  const iaFeatures = [
    {
      icon: Bot,
      title: "Mensagens automáticas",
      desc: "Respostas iniciais inteligentes para acelerar o atendimento.",
    },
    { icon: Calendar, title: "Follow-up automático", desc: "Não deixe leads quentes sem retorno." },
    { icon: Brain, title: "Análise de conversas", desc: "Entenda intenção, urgência e objeções." },
    {
      icon: Shield,
      title: "Quebra de objeções",
      desc: "Sugestões para aumentar a taxa de resposta.",
    },
    {
      icon: Zap,
      title: "Agendamento automático",
      desc: "Leve o lead para a próxima etapa sem atrito.",
    },
  ];

  return (
    <div className="space-y-8 max-w-[1300px] mx-auto">
      <Card className="overflow-hidden border-border/70 p-0">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-0">
          <div className="p-8 md:p-10 flex flex-col justify-center texture-paper">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-emerald/10 text-emerald text-[11px] font-semibold">
              <Puzzle className="h-3 w-3" /> CHROME EXTENSION
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mt-4 leading-[1.05]">
              Extensão de Atendimento Lead Link
            </h1>
            <p className="text-muted-foreground mt-4 max-w-xl">
              Transforme seu WhatsApp Web em uma central de atendimento imobiliário com histórico,
              score e automações.
            </p>
            <p className="text-sm text-muted-foreground mt-4 max-w-xl">
              A extensão do Lead Link ajuda o corretor a atender mais rápido, entender o perfil do
              lead e organizar o acompanhamento sem sair do WhatsApp Web.
            </p>
            {isFree ? (
              <div className="mt-6 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium">
                  <Lock className="h-3.5 w-3.5" /> Recurso Pro
                </div>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Você conhece o valor da extensão, mas o download fica disponível no Pro.
                </p>
                <Button
                  className="bg-navy text-navy-foreground hover:bg-navy/90 rounded-full h-11 px-6"
                  onClick={() => setDownloadDialogOpen(true)}
                >
                  Fazer upgrade para Pro <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-6">
                <Button
                  className="bg-navy text-navy-foreground hover:bg-navy/90 rounded-full h-11 px-6"
                  onClick={() => setDownloadDialogOpen(true)}
                >
                  <Chrome className="h-4 w-4 mr-2" />{" "}
                  {isCommercial ? "Entrar na lista da IA" : "Baixar extensão"}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full h-11 px-6"
                  onClick={() => setInstallDialogOpen(true)}
                >
                  Ver instalação
                </Button>
              </div>
            )}
            <div className="mt-5 grid gap-2 sm:grid-cols-3 max-w-xl">
              <PlanPill active={isFree} label="Free" description="Preview liberado" />
              <PlanPill active={isPro} label="Pro" description="Extensão manual" />
              <PlanPill
                active={isCommercial}
                label="Comercial IA"
                description="Automação assistida"
              />
            </div>
            <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald" /> Painel lateral no WhatsApp Web
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald" /> Histórico e score
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald" /> CRM sincronizado
              </span>
            </div>
          </div>
          <div className="relative bg-gradient-to-br from-emerald/10 via-cream to-gold/10 p-6 md:p-10 flex items-center justify-center min-h-[380px]">
            <div className="bg-card rounded-2xl shadow-lift border border-border w-full max-w-md overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/40">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
                </div>
                <div className="text-[10px] text-muted-foreground ml-2 font-mono">
                  web.whatsapp.com
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-emerald/10 border border-emerald/20 rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-emerald font-semibold mb-1.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Extensão ativa
                  </div>
                  <div className="text-xs text-foreground leading-relaxed">
                    "Olá Ana! Vi seu interesse na Cobertura Duplex no Itaim. Posso agendar uma
                    visita ainda esta semana?"
                  </div>
                </div>
                <div className="bg-secondary/60 rounded-xl p-3 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Ficha do lead
                  </div>
                  <div className="text-xs font-semibold">Ana Beatriz Almeida</div>
                  <div className="text-[11px] text-muted-foreground">
                    Score 84 · Itaim Bibi · R$ 8M
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-normal border-border rounded-full"
                  >
                    Agendar visita
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-normal border-border rounded-full"
                  >
                    Enviar imóvel
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-normal border-border rounded-full"
                  >
                    Proposta
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div>
        <div className="divider-ornament max-w-md mx-auto">
          <span>Recursos da extensão</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
          {proFeatures.map((f) => (
            <Card key={f.title} className="p-5 border-border/70 hover:shadow-soft transition-all">
              <div className="h-10 w-10 rounded-xl bg-emerald/10 text-emerald flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </Card>
          ))}
          {isCommercial &&
            iaFeatures.map((f) => (
              <Card
                key={f.title}
                className="p-5 border-gold/30 bg-gradient-to-b from-gold/5 to-transparent hover:shadow-soft transition-all"
              >
                <div className="h-10 w-10 rounded-xl bg-gold/15 text-gold flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </Card>
            ))}
        </div>
      </div>

      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extensão em breve</DialogTitle>
            <DialogDescription>
              A extensão estará disponível em breve. Assim que liberarmos o download, este botão
              passará a funcionar.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Como instalar a extensão</DialogTitle>
            <DialogDescription>
              Quando o pacote estiver disponível, siga estes passos no Chrome.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Baixe o pacote da extensão pelo botão de download.</li>
            <li>Abra `chrome://extensions` no navegador.</li>
            <li>Ative o Modo do desenvolvedor no canto superior direito.</li>
            <li>Clique em Carregar sem compactação e selecione a pasta da extensão.</li>
            <li>Abra o WhatsApp Web e confirme se o painel do Lead Link apareceu.</li>
          </ol>
        </DialogContent>
      </Dialog>

      <Card className="p-8 border-border/70">
        <div className="divider-ornament max-w-xs">
          <span>Vídeo demonstrativo</span>
        </div>
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-secondary/40 p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-card ring-1 ring-border flex items-center justify-center">
            <Chrome className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mt-4">
            Em breve você verá aqui como a extensão funciona na prática.
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            O vídeo demonstrativo vai mostrar o fluxo real dentro do WhatsApp Web, com histórico,
            score e automações.
          </p>
        </div>
      </Card>
    </div>
  );
}

function PlanPill({
  active,
  label,
  description,
}: {
  active: boolean;
  label: string;
  description: string;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${active ? "border-gold/50 bg-gold/10" : "border-white/15 bg-white/[0.04]"}`}
    >
      <div className="text-xs font-semibold">{label}</div>
      <div className="text-[10px] text-muted-foreground">{description}</div>
    </div>
  );
}
