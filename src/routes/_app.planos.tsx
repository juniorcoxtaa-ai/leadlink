import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Zap,
  Crown,
  Sparkles,
  ArrowRight,
  Lock,
  AlertCircle,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getAvailablePlans } from "@/server-fns/plans";
import {
  createCheckoutSession,
  createCustomerPortalSession,
  cancelSubscription,
  reactivateSubscription,
  saveBillingInfoAndCheckout,
} from "@/server-fns/stripe";
import { getMyProfile } from "@/server-fns/profile";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { formatPrice, usagePercent, isNearLimit, isAtLimit, PLAN_PUBLIC_CATALOG, type PublicPlanCard } from "@/lib/plans";
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
  free: [
    "1 usuário",
    "Até 5 imóveis cadastrados",
    "Até 30 leads por mês",
    "Link público do corretor",
    "Vitrine básica de imóveis",
    "Captura de leads (nome, cidade, telefone)",
  ],
  pro: [
    "1 usuário principal",
    "Até 50 imóveis cadastrados",
    "Até 500 leads por mês",
    "Imóveis em destaque",
    "CRM completo com status de lead",
    "Até 3 formulários personalizados",
    "Integração com WhatsApp",
    "Personalização visual básica",
    "Sem marca Leadlink",
  ],
  comercial: [
    "Tudo do plano Pro",
    "IA de atendimento integrada",
    "Mensagens automáticas",
    "Follow-up automático",
    "Análise de conversas",
    "Sugestões para quebrar objeções",
    "Apoio no agendamento de visitas",
    "Atendimento mais rápido no WhatsApp",
    "Ideal para corretores e imobiliárias que querem escalar atendimento",
  ],
  comercial_ia: [
    "Tudo do plano Pro",
    "IA de atendimento integrada",
    "Mensagens automáticas",
    "Follow-up automático",
    "Análise de conversas",
    "Sugestões para quebrar objeções",
    "Apoio no agendamento de visitas",
    "Atendimento mais rápido no WhatsApp",
    "Ideal para corretores e imobiliárias que querem escalar atendimento",
  ],
};

const PLAN_LOCKED: Record<string, string[]> = {
  free: [
    "Leads acima de 15 por mês",
    "Imóveis acima de 3",
    "Imagem de fundo do Meu Link",
    "Edição avançada do Quiz",
    "Vídeos do Meu Link",
    "Extensão",
  ],
  pro: ["Gestão de múltiplos usuários", "Distribuição de leads", "Dashboard avançado"],
  comercial: [],
  comercial_ia: [],
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
  const normalizedSlug = plan.slug === "comercial" ? "comercial_ia" : plan.slug;
  const currentNormalizedSlug = currentSlug === "comercial" ? "comercial_ia" : currentSlug;
  const isCurrent = normalizedSlug === currentNormalizedSlug;
  const isPro = normalizedSlug === "pro";
  const isComercial = normalizedSlug === "comercial_ia";
  const displayName = isComercial ? "Comercial IA" : plan.name;
  const features = PLAN_FEATURES[normalizedSlug] ?? [];
  const locked = PLAN_LOCKED[normalizedSlug] ?? [];
  const isContactPlan = false;
  const isPaid = subscriptionStatus === "active" || subscriptionStatus === "trialing";

  const cardClass = isPro
    ? "border-2 border-navy shadow-elegant"
    : isComercial
      ? "bg-gradient-to-br from-navy to-navy/80 text-navy-foreground border-gold/40"
      : "border-border/70";

  const iconClass = isComercial
    ? "bg-gold text-navy"
    : isPro
      ? "bg-navy text-navy-foreground"
      : "bg-secondary";

  const mutedClass = isComercial ? "text-navy-foreground/70" : "text-muted-foreground";
  const checkClass = isComercial ? "text-gold" : "text-emerald";

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
    // Comercial: sempre contato
    if (isContactPlan) {
      return (
        <Button className="w-full bg-gold text-navy hover:bg-gold/90 font-semibold gap-2" asChild>
          <a
            href="https://wa.me/5511999999999?text=Quero+saber+mais+sobre+o+plano+Comercial"
            target="_blank"
            rel="noopener noreferrer"
          >
            Falar com consultor <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
      );
    }

    // Free plan card
    if (plan.slug === "free") {
      if (currentSlug === "free") {
        return (
          <Button variant="outline" className="w-full" disabled>
            Plano atual
          </Button>
        );
      }
      // User is on paid plan — downgrade via portal (Bug fix #6: only if has Stripe customer)
      if (!hasStripeCustomer) {
        return (
          <Button variant="outline" className="w-full" disabled>
            Contate o suporte
          </Button>
        );
      }
      return (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => portalMutation.mutate()}
          disabled={isWorking}
        >
          {portalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Gerenciar assinatura
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
            className={`w-full gap-2 ${isPro ? "bg-navy text-navy-foreground hover:bg-navy/90" : ""}`}
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
        className={`w-full gap-2 ${isPro ? "bg-navy text-navy-foreground hover:bg-navy/90" : ""}`}
        onClick={() => checkoutMutation.mutate(normalizedSlug as "pro" | "comercial_ia")}
        disabled={isWorking}
      >
        {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {currentSlug === "free" ? `Assinar ${displayName}` : `Fazer upgrade`}
        {!isWorking && <ArrowRight className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Card className={`p-6 flex flex-col relative ${cardClass}`}>
      {isPro && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-navy text-navy-foreground text-xs">
          Mais popular
        </Badge>
      )}
      {isComercial && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy text-xs">
          <Sparkles className="h-3 w-3 mr-1" /> Para imobiliárias
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
        <p className={`text-xs ${mutedClass}`}>{plan.description}</p>
      </div>

      {/* Preço */}
      <div className="mt-5">
        {isComercial ? (
          <>
            <div className="text-3xl font-bold">
              R$497
              <span className={`text-sm font-normal ${mutedClass}`}>/mês</span>
            </div>
            <div className={`text-xs ${mutedClass}`}>cobrança mensal</div>
          </>
        ) : plan.priceMonthly === 0 ? (
          <>
            <div className="text-3xl font-bold">Grátis</div>
            <div className={`text-xs ${mutedClass}`}>para sempre</div>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold">
              {formatPrice(plan.priceMonthly)}
              <span className={`text-sm font-normal ${mutedClass}`}>/mês</span>
            </div>
            <div className={`text-xs ${mutedClass}`}>cobrança mensal</div>
          </>
        )}
      </div>

      {/* Features incluídas */}
      <ul className="mt-6 space-y-2 text-sm flex-1">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check className={`h-4 w-4 shrink-0 mt-0.5 ${checkClass}`} />
            <span>{f}</span>
          </li>
        ))}
        {locked.map((f) => (
          <li
            key={f}
            className={`flex gap-2 ${isComercial ? "text-navy-foreground/40" : "text-muted-foreground/50"}`}
          >
            <Lock className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="line-through">{f}</span>
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

type BillingDraft = {
  cpfCnpj: string;
  billingName: string;
  billingEmail: string;
  billingAddressLine1: string;
  billingAddressCity: string;
  billingAddressState: string;
  billingAddressZip: string;
};

type BillingProfile = Partial<BillingDraft>;

function isBillingComplete(profile: BillingProfile | null | undefined): boolean {
  return Boolean(
    profile?.cpfCnpj &&
    profile?.billingName &&
    profile?.billingEmail &&
    profile?.billingAddressLine1 &&
    profile?.billingAddressCity &&
    profile?.billingAddressState &&
    profile?.billingAddressZip,
  );
}

function PlansPage() {
  const search = useSearch({ from: "/_app/planos" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { planSlug, subscriptionStatus, cancelAtPeriodEnd, hasStripeCustomer } = usePlanLimits();
  const toastShown = useRef(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState("pro" as "pro" | "comercial_ia");
  const [billingDraft, setBillingDraft] = useState<BillingDraft>({
    cpfCnpj: "",
    billingName: "",
    billingEmail: "",
    billingAddressLine1: "",
    billingAddressCity: "",
    billingAddressState: "",
    billingAddressZip: "",
  });

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

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getMyProfile(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (profile) {
      setBillingDraft({
        cpfCnpj: profile.cpfCnpj ?? "",
        billingName: profile.billingName ?? "",
        billingEmail: profile.billingEmail ?? "",
        billingAddressLine1: profile.billingAddressLine1 ?? "",
        billingAddressCity: profile.billingAddressCity ?? "",
        billingAddressState: profile.billingAddressState ?? "",
        billingAddressZip: profile.billingAddressZip ?? "",
      });
    }
  }, [profile]);

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
  const billingReady = isBillingComplete(profile);
  const filteredPlans = useMemo(() => {
    const bySlug = new Map(
      availablePlans
        .filter((plan) => ["free", "pro", "comercial", "comercial_ia"].includes(plan.slug))
        .map((plan) => [plan.slug === "comercial" ? "comercial_ia" : plan.slug, { ...plan, slug: plan.slug === "comercial" ? "comercial_ia" : plan.slug }] as const),
    );

    return PLAN_PUBLIC_CATALOG.map((canonical) => {
      const dbPlan = bySlug.get(canonical.slug);
      return {
        ...(dbPlan ?? canonical),
        slug: canonical.slug,
        name: canonical.slug === "comercial_ia" ? "Comercial IA" : (dbPlan?.name ?? canonical.name),
        description: dbPlan?.description ?? canonical.description,
        priceMonthly: canonical.slug === "comercial_ia" ? 49700 : (dbPlan?.priceMonthly ?? canonical.priceMonthly),
        setupFee: dbPlan?.setupFee ?? canonical.setupFee,
        isActive: dbPlan?.isActive ?? canonical.isActive,
        maxUsers: dbPlan?.maxUsers ?? canonical.maxUsers,
        maxProperties: dbPlan?.maxProperties ?? canonical.maxProperties,
        maxLeadsPerMonth: dbPlan?.maxLeadsPerMonth ?? canonical.maxLeadsPerMonth,
        maxCustomForms: dbPlan?.maxCustomForms ?? canonical.maxCustomForms,
        hasCrm: dbPlan?.hasCrm ?? canonical.hasCrm,
        hasAdvancedDashboard: dbPlan?.hasAdvancedDashboard ?? canonical.hasAdvancedDashboard,
        hasCustomBranding: dbPlan?.hasCustomBranding ?? canonical.hasCustomBranding,
        hasTeamManagement: dbPlan?.hasTeamManagement ?? canonical.hasTeamManagement,
        hasLeadDistribution: dbPlan?.hasLeadDistribution ?? canonical.hasLeadDistribution,
        hasPrioritySupport: dbPlan?.hasPrioritySupport ?? canonical.hasPrioritySupport,
        showLeadlinkBranding: dbPlan?.showLeadlinkBranding ?? canonical.showLeadlinkBranding,
      } as PublicPlanCard;
    });
  }, [availablePlans]);

  const submitBillingAndCheckout = useMutation({
    mutationFn: async () =>
      saveBillingInfoAndCheckout({ data: { ...billingDraft, planSlug: selectedPlanSlug } }),
    onSuccess: (data) => {
      setBillingOpen(false);
      toast.success("Dados de cobrança salvos. Redirecionando para o checkout...");
      if (data?.url) window.location.href = data.url;
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function startCheckout(planSlugToBuy: "pro" | "comercial_ia") {
    setSelectedPlanSlug(planSlugToBuy);
    if (!billingReady) {
      setBillingOpen(true);
      return;
    }
    submitBillingAndCheckout.mutate();
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-gold/5 p-8 md:p-10 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Badge className="bg-gold/15 text-gold border border-gold/30">Planos Leadlink</Badge>
          <Badge variant="outline">Sem trial</Badge>
        </div>
        <div className="max-w-3xl space-y-3">
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Escolha o plano ideal para o seu negócio
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Assinatura imediata, cobrança segura e upgrade em poucos cliques.
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

      <Dialog open={billingOpen} onOpenChange={setBillingOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dados de cobrança</DialogTitle>
            <DialogDescription>
              Preencha os dados para seguir para o checkout Stripe.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {[
              ["cpfCnpj", "CPF/CNPJ"],
              ["billingName", "Nome para cobrança"],
              ["billingEmail", "Email de cobrança"],
              ["billingAddressZip", "CEP"],
              ["billingAddressLine1", "Endereço"],
              ["billingAddressCity", "Cidade"],
              ["billingAddressState", "Estado"],
            ].map(([key, label]) => (
              <div key={key} className="grid gap-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  value={billingDraft[key as keyof BillingDraft] ?? ""}
                  onChange={(e) =>
                    setBillingDraft((current) => ({ ...current, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBillingOpen(false)}
              disabled={submitBillingAndCheckout.isPending}
            >
              Continuar depois
            </Button>
            <Button
              onClick={() => submitBillingAndCheckout.mutate()}
              disabled={submitBillingAndCheckout.isPending}
            >
              {submitBillingAndCheckout.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Ir para o checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
