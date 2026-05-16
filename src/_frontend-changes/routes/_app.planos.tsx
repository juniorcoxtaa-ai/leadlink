import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Crown, Zap } from "lucide-react";

export const Route = createFileRoute("/_app/planos")({
  head: () => ({ meta: [{ title: "Planos — Leadlink" }] }),
  component: PlansPage,
});

const FREE_FEATURES = [
  "Link personalizado (Meu Link)",
  "Até 3 imóveis cadastrados",
  "Até 2 compromissos na agenda",
  "Captura básica de leads",
];

const PRO_FEATURES = [
  "Link personalizado (Meu Link)",
  "Imóveis ilimitados",
  "Agenda ilimitada",
  "Vitrine pública completa",
  "Pipeline de leads completo",
  "Automações de WhatsApp e e-mail",
  "Relatórios e métricas avançadas",
  "Integrações com portais",
];

const COMERCIAL_FEATURES = [
  "Tudo do plano Pro",
  "IA integrada nas conversas",
  "Qualificação automática de leads",
  "Respostas inteligentes no WhatsApp",
  "Sugestões de imóveis por IA",
  "Resumo automático de atendimentos",
  "Suporte prioritário",
];

function PlansPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <Badge className="bg-gold/15 text-gold border border-gold/30">Planos Leadlink</Badge>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
          Escolha o plano ideal para o seu negócio
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
          Comece grátis e evolua quando precisar de mais. Cancele quando quiser, sem
          fidelidade.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {/* FREE */}
        <Card className="p-6 flex flex-col border-border/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                <Zap className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-lg">Gratuito</h3>
            </div>
            <p className="text-xs text-muted-foreground">Para começar e testar</p>
          </div>
          <div className="mt-5">
            <div className="text-3xl font-bold">R$ 0</div>
            <div className="text-xs text-muted-foreground">para sempre</div>
          </div>
          <ul className="mt-6 space-y-2.5 text-sm flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="h-4 w-4 text-emerald shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="mt-6">Plano atual</Button>
        </Card>

        {/* PRO */}
        <Card className="p-6 flex flex-col relative border-2 border-navy shadow-elegant">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-navy text-navy-foreground">
            Mais popular
          </Badge>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-navy text-navy-foreground flex items-center justify-center">
                <Crown className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-lg">Pro</h3>
            </div>
            <p className="text-xs text-muted-foreground">Para o corretor profissional</p>
          </div>
          <div className="mt-5">
            <div className="text-3xl font-bold">
              R$ 97<span className="text-sm font-normal text-muted-foreground">,00/mês</span>
            </div>
            <div className="text-xs text-muted-foreground">cobrança mensal</div>
          </div>
          <ul className="mt-6 space-y-2.5 text-sm flex-1">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="h-4 w-4 text-emerald shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button className="mt-6 bg-navy text-navy-foreground hover:bg-navy/90">
            Assinar Pro
          </Button>
        </Card>

        {/* COMERCIAL IA */}
        <Card className="p-6 flex flex-col relative bg-gradient-to-br from-navy to-navy/80 text-navy-foreground border-gold/40">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy">
            <Sparkles className="h-3 w-3 mr-1" /> IA inclusa
          </Badge>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-gold text-navy flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-lg">Comercial IA</h3>
            </div>
            <p className="text-xs text-navy-foreground/70">Vendas em escala com IA</p>
          </div>
          <div className="mt-5">
            <div className="text-3xl font-bold">
              R$ 197<span className="text-sm font-normal text-navy-foreground/70">,00/mês</span>
            </div>
            <div className="text-xs text-navy-foreground/70">cobrança mensal</div>
          </div>
          <ul className="mt-6 space-y-2.5 text-sm flex-1">
            {COMERCIAL_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button className="mt-6 bg-gold text-navy hover:bg-gold/90 font-semibold">
            Assinar Comercial IA
          </Button>
        </Card>
      </div>

      <Card className="p-5 text-center text-xs text-muted-foreground">
        Pagamento seguro · Cancele a qualquer momento · Suporte em português
      </Card>
    </div>
  );
}
