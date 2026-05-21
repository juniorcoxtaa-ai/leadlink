import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import {
  Check,
  Zap,
  Crown,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getAvailablePlans } from "@/server-fns/plans";
import {
  createCheckoutSession,
  createCustomerPortalSession,
  cancelSubscription,
  reactivateSubscription,
} from "@/server-fns/stripe";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { usagePercent, isNearLimit, isAtLimit } from "@/lib/plans";
import type { Plan } from "@/db/schema";

export const Route = createFileRoute("/_app/planos")({
  head: () => ({ meta: [{ title: "Planos — Leadlink" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    success: search.success === "true" || search.success === true || undefined,
    canceled: search.canceled === "true" || search.canceled === true || undefined,
  }),
  component: PlansPage,
});

// ─── Ícone por slug ───────────────────────────────────────────────────────────

function PlanIcon({ slug }: { slug: string }) {
  if (slug === "pro") return <Crown className="h-4 w-4" />;
  if (slug === "comercial" || slug === "comercial_ia") return <Sparkles className="h-4 w-4" />;
  return <Zap className="h-4 w-4" />;
}

// ─── Features exibidas em cada card ──────────────────────────────────────────

const PLAN_FEATURES: Record<string, string[]> = {
  pro: [
    "Página personalizada do corretor",
    "Vitrine de imóveis",
    "Quiz inteligente de qualificação",
    "Leads direto no WhatsApp",
    "Cadastro de imóveis",
    "Painel de leads",
    "Classificação automática de leads",
    "Link personalizado LeadLink",
    "Integração com Instagram/Bio",
    "Suporte padrão",
  ],
  comercial: [
    "Gestão completa de equipe",
    "Painel do gestor da imobiliária",
    "Acompanhamento de todos os corretores",
    "Vantagens exclusivas para gestor/superior",
    "Distribuição inteligente de leads",
    "Relatórios comerciais",
    "Controle de performance individual",
    "Organização centralizada dos atendimentos",
    "Atendimento exclusivo",
    "Contato direto com administradores da LeadLink",
    "Suporte prioritário",
    "Implantação personalizada",
  ],
  comercial_ia: [
    "Tudo do plano Pro",
    "Extensão LeadLink para WhatsApp Web",
    "IA para resumo de conversas",
    "Sugestões inteligentes de resposta",
    "Classificação automática por comportamento",
    "Organização avançada de atendimentos",
    "Recuperação de leads frios",
    "Automação de follow-up",
    "Prioridade para leads quentes",
    "Painel operacional avançado",
    "Suporte prioritário",
  ],
};

const PLAN_META: Record<
  string,
  {
    name: string;
    subtitle: string;
    price: string;
    billingNote: string;
    buttonLabel: string;
    badge?: string;
  }
> = {
  pro: {
    name: "Plano Pro",
    subtitle:
      "Para corretores autônomos que querem captar, organizar e atender leads com mais profissionalismo.",
    price: "R$97/mês",
    billingNote: "cobrança mensal",
    buttonLabel: "Começar agora",
  },
  comercial_ia: {
    name: "Comercial IA",
    subtitle:
      "Para corretores que querem uma operação comercial mais inteligente com IA, automações e extensão para WhatsApp Web.",
    price: "R$497/mês",
    billingNote: "lançamento futuro",
    buttonLabel: "EM BREVE",
    badge: "EM BREVE",
  },
  comercial: {
    name: "Plano Imobiliária",
    subtitle:
      "Para imobiliárias que precisam acompanhar corretores, centralizar leads e estruturar uma operação comercial mais previsível.",
    price: "R$297/mês por corretor",
    billingNote: "implantação personalizada",
    buttonLabel: "Solicitar implantação",
  },
};

// ─── Card de plano ────────────────────────────────────────────────────────────

type PlanCardProps = {
  plan: Plan;
  currentSlug: string;
  subscriptionStatus: string;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
};

function PlanCard({
  plan,
  currentSlug,
  subscriptionStatus,
  cancelAtPeriodEnd,
  hasStripeCustomer,
}: PlanCardProps) {
  const queryClient = useQueryClient();
  const presentationSlug = plan.slug;
  const currentNormalizedSlug = currentSlug === "comercial" ? "comercial" : currentSlug;
  const isCurrent = presentationSlug === currentNormalizedSlug;
  const isPro = presentationSlug === "pro";
  const isComingSoon = presentationSlug === "comercial_ia";
  const isImobiliaria = presentationSlug === "comercial";
  const planMeta = PLAN_META[presentationSlug];
  const displayName = planMeta?.name ?? plan.name;
  const features = PLAN_FEATURES[presentationSlug] ?? [];
  const isPaid = subscriptionStatus === "active" || subscriptionStatus === "trialing";

  const cardClass = isComingSoon
    ? "border border-gold/35 bg-[radial-gradient(circle_at_top,_rgba(212,165,116,0.16),_transparent_48%),linear-gradient(135deg,#142033,#1b2b44)] text-white shadow-elegant"
    : isImobiliaria
      ? "border border-navy/15 bg-[linear-gradient(180deg,rgba(212,165,116,0.08),rgba(255,255,255,0.98))] shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
      : "border border-border/70 bg-background shadow-sm";

  const iconClass = isComingSoon
    ? "bg-gold text-navy"
    : isImobiliaria
      ? "bg-navy text-navy-foreground"
      : "bg-secondary";

  const mutedClass = isComingSoon ? "text-white/78" : "text-muted-foreground";
  const checkClass = isComingSoon ? "text-gold" : isImobiliaria ? "text-navy" : "text-emerald";

  const checkoutMutation = useMutation({
    mutationFn: (slug: "pro" | "comercial" | "comercial_ia") =>
      createCheckoutSession({ data: { planSlug: slug } }),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (e: Error) => toast.error(`Erro ao iniciar checkout: ${e.message}`),
  });

  const portalMutation = useMutation({
    mutationFn: () => createCustomerPortalSession(),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (e: Error) => toast.error(`Erro ao abrir portal: ${e.message}`),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelSubscription(),
    onSuccess: () => {
      toast.success("Assinatura será cancelada ao final do período.");
      queryClient.invalidateQueries({ queryKey: ["plan-context"] });
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateSubscription(),
    onSuccess: () => {
      toast.success("Assinatura reativada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["plan-context"] });
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const isWorking =
    checkoutMutation.isPending ||
    portalMutation.isPending ||
    cancelMutation.isPending ||
    reactivateMutation.isPending;

  function renderCTA() {
    if (isComingSoon) {
      return (
        <Button className="w-full bg-gold text-navy hover:bg-gold/95 font-semibold" disabled>
          EM BREVE
        </Button>
      );
    }

    // Paid plan card (pro)
    if (isCurrent) {
      if (cancelAtPeriodEnd) {
        // Cancelamento agendado: mostrar reativar
        return (
          <div className="space-y-2">
            <p className="text-[11px] text-center text-amber-600">Cancela no fim do período</p>
            <Button
              className="w-full gap-2"
              onClick={() => reactivateMutation.mutate()}
              disabled={isWorking}
            >
              {reactivateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reativar assinatura
            </Button>
          </div>
        );
      }
      // Active current plan — Bug fix #6: only show portal if Stripe customer exists
      if (!hasStripeCustomer) {
        return (
          <div className="space-y-2">
            <Button variant="outline" className="w-full" disabled>
              Plano ativo (manual)
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              Plano ativado pelo suporte · Entre em contato para alterações
            </p>
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <Button
            className={`w-full gap-2 ${isPro || isImobiliaria ? "bg-navy text-navy-foreground hover:bg-navy/90" : ""}`}
            onClick={() => portalMutation.mutate()}
            disabled={isWorking}
          >
            {portalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Gerenciar assinatura
          </Button>
          {isPaid && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground text-xs"
              onClick={() => cancelMutation.mutate()}
              disabled={isWorking}
            >
              {cancelMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Cancelar assinatura
            </Button>
          )}
        </div>
      );
    }

    // Upgrade to this paid plan
    return (
      <Button
        className={`w-full gap-2 ${isPro || isImobiliaria ? "bg-navy text-navy-foreground hover:bg-navy/90" : ""}`}
        onClick={() => checkoutMutation.mutate(plan.slug as "pro" | "comercial")}
        disabled={isWorking}
      >
        {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {planMeta?.buttonLabel ?? "Fazer upgrade"}
        {!isWorking && <ArrowRight className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Card className={`p-6 flex flex-col relative ${cardClass}`}>
      {isPro && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-navy text-navy-foreground text-xs">
          Profissional
        </Badge>
      )}
      {isComingSoon && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy text-xs">
          <Sparkles className="h-3 w-3 mr-1" /> {planMeta.badge}
        </Badge>
      )}
      {isImobiliaria && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold/90 text-navy text-xs">
          Estrutura corporativa
        </Badge>
      )}

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}
          >
            <PlanIcon slug={plan.slug} />
          </div>
          <h3 className="font-semibold text-lg">{displayName}</h3>
          {isCurrent && (
            <Badge variant="outline" className="text-[10px]">
              Atual
            </Badge>
          )}
        </div>
        <p className={`text-xs leading-relaxed ${mutedClass}`}>
          {planMeta?.subtitle ?? plan.description}
        </p>
      </div>

      {/* Preço */}
      <div className="mt-5">
        <div className="text-3xl font-bold tracking-tight">
          {planMeta?.price ?? plan.priceMonthly}
        </div>
        <div className={`text-xs ${mutedClass}`}>{planMeta?.billingNote ?? "cobrança mensal"}</div>
      </div>

      {/* Features incluídas */}
      <ul className="mt-6 space-y-2 text-sm flex-1">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check className={`h-4 w-4 shrink-0 mt-0.5 ${checkClass}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-6">{renderCTA()}</div>
    </Card>
  );
}

// ─── Painel de uso atual ──────────────────────────────────────────────────────

function UsagePanel() {
  const { limits, usage, planName, planSlug, isLoading, isError } = usePlanLimits();

  if (isLoading) {
    return (
      <Card className="p-5 space-y-4">
        <Skeleton className="h-4 w-40" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-1.5 w-full rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-5 flex items-center gap-3 border-destructive/30 bg-destructive/5">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar os dados do seu plano. Tente recarregar a página.
        </p>
      </Card>
    );
  }

  const items = [
    {
      label: "Imóveis",
      used: usage.propertiesCount,
      max: limits.maxProperties,
      key: "properties_limit",
    },
    {
      label: "Leads (mês)",
      used: usage.leadsThisMonth,
      max: limits.maxLeadsPerMonth,
      key: "leads_limit",
    },
    { label: "Usuários", used: usage.usersCount, max: limits.maxUsers, key: "team_management" },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <p className="font-semibold text-sm">Seu uso atual — Plano {planName}</p>
          <p className="text-xs text-muted-foreground">Atualizado em tempo real</p>
        </div>
        {planSlug !== "comercial_ia" && (
          <Badge variant="outline" className="text-xs shrink-0">
            Upgrade disponível
          </Badge>
        )}
      </div>
      <div className="space-y-4">
        {items.map((item) => {
          const pct = usagePercent(item.used, item.max);
          const near = isNearLimit(item.used, item.max);
          const at = isAtLimit(item.used, item.max);
          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span
                  className={`font-medium ${at ? "text-destructive" : near ? "text-amber-600" : ""}`}
                >
                  {item.used} / {item.max}
                  {at && " — Limite atingido"}
                  {near && !at && ` — ${pct}%`}
                </span>
              </div>
              <Progress
                value={pct}
                className={`h-1.5 ${at ? "[&>div]:bg-destructive" : near ? "[&>div]:bg-amber-500" : ""}`}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Botão de portal para banner past_due ────────────────────────────────────

function PastDuePortalButton() {
  const portalMutation = useMutation({
    mutationFn: () => createCustomerPortalSession(),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (e: Error) => toast.error(`Erro ao abrir portal: ${e.message}`),
  });
  return (
    <Button
      size="sm"
      variant="destructive"
      onClick={() => portalMutation.mutate()}
      disabled={portalMutation.isPending}
    >
      {portalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
      Atualizar pagamento
    </Button>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

function PlansPage() {
  const search = useSearch({ from: "/_app/planos" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { planSlug, subscriptionStatus, cancelAtPeriodEnd, hasStripeCustomer } = usePlanLimits();
  const toastShown = useRef(false);

  const {
    data: availablePlans = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["available-plans"],
    queryFn: () => getAvailablePlans(),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (toastShown.current) return;
    if (search.success) {
      toastShown.current = true;
      toast.success("Pagamento recebido! Aguardando confirmação do Stripe...", { duration: 8000 });
      queryClient.invalidateQueries({ queryKey: ["plan-context"] });
      navigate({
        to: "/planos",
        search: { success: undefined, canceled: undefined },
        replace: true,
      });
    } else if (search.canceled) {
      toastShown.current = true;
      toast.info("Checkout cancelado. Você continua no seu plano atual.");
      navigate({
        to: "/planos",
        search: { success: undefined, canceled: undefined },
        replace: true,
      });
    }
  }, [navigate, queryClient, search.canceled, search.success]);

  const isPastDue = subscriptionStatus === "past_due";
  const filteredPlans = useMemo(() => {
    const bySlug = new Map(
      availablePlans
        .filter((plan) => ["pro", "comercial", "comercial_ia"].includes(plan.slug))
        .map((plan) => [plan.slug, plan] as const),
    );

    return ["pro", "comercial_ia", "comercial"].map((slug) => {
      const dbPlan = bySlug.get(slug);
      const fallbackPlan: Plan = {
        id: `marketing_${slug}`,
        slug,
        name: PLAN_META[slug].name,
        description: PLAN_META[slug].subtitle,
        priceMonthly: slug === "pro" ? 9700 : slug === "comercial" ? 29700 : 49700,
        setupFee: 0,
        isActive: true,
        maxUsers: slug === "comercial" ? 20 : 1,
        maxProperties: slug === "pro" ? 999 : 9999,
        maxLeadsPerMonth: slug === "pro" ? 999 : 9999,
        maxCustomForms: 999,
        hasCrm: true,
        hasAdvancedDashboard: slug !== "pro",
        hasCustomBranding: true,
        hasTeamManagement: slug !== "pro",
        hasLeadDistribution: slug !== "pro",
        hasPrioritySupport: slug !== "pro",
        showLeadlinkBranding: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        ...fallbackPlan,
        ...dbPlan,
        slug,
        name: PLAN_META[slug].name,
        description: PLAN_META[slug].subtitle,
      } as Plan;
    });
  }, [availablePlans]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-gold/5 p-8 md:p-10 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Badge className="bg-gold/15 text-gold border border-gold/30">Planos Leadlink</Badge>
          <Badge variant="outline">Pré-lançamento comercial</Badge>
        </div>
        <div className="max-w-3xl space-y-3">
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Escolha a estrutura ideal para sua operação imobiliária.
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Do corretor autônomo até equipes completas com gestão centralizada, IA e distribuição
            inteligente de leads.
          </p>
        </div>
      </div>

      {isPastDue ? (
        <Card className="p-4 border-destructive/40 bg-destructive/5 flex items-center gap-3">
          <TriangleAlert className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">Problema com seu pagamento</p>
            <p className="text-xs text-muted-foreground">
              Atualize sua forma de pagamento para continuar usando o plano.
            </p>
          </div>
          {hasStripeCustomer ? <PastDuePortalButton /> : null}
        </Card>
      ) : null}

      <UsagePanel />

      {isError ? (
        <Card className="p-8 text-center border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Erro ao carregar os planos. Tente recarregar a página.
          </p>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-5 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-9 w-9 rounded-lg mb-3" />
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-8 w-20 mb-6" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {filteredPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentSlug={planSlug}
              subscriptionStatus={subscriptionStatus}
              cancelAtPeriodEnd={cancelAtPeriodEnd}
              hasStripeCustomer={hasStripeCustomer}
            />
          ))}
        </div>
      )}

      <Card className="p-5 text-center text-xs text-muted-foreground">
        Pagamento seguro · Cancele a qualquer momento · Suporte em português
      </Card>
    </div>
  );
}
