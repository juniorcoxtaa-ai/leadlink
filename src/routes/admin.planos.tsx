import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, Users, Building2, Zap, Crown, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getAvailablePlans, getAdminOrganizations, updateOrgPlan } from "@/server-fns/plans";
import { formatPrice } from "@/lib/plans";
import type { Plan } from "@/db/schema";

export const Route = createFileRoute("/admin/planos")({
  component: AdminPlans,
});

function PlanIcon({ slug }: { slug: string }) {
  if (slug === "pro") return <Crown className="h-4 w-4" />;
  if (slug === "comercial") return <Sparkles className="h-4 w-4" />;
  return <Zap className="h-4 w-4" />;
}

const PLAN_COLORS: Record<string, string> = {
  free: "bg-secondary text-secondary-foreground",
  pro: "bg-navy text-navy-foreground",
  comercial: "bg-gold text-navy",
};

function PlanCard({ plan, subscriberCount }: { plan: Plan; subscriberCount: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${PLAN_COLORS[plan.slug] ?? "bg-secondary"}`}>
            <PlanIcon slug={plan.slug} />
          </div>
          <div>
            <Badge variant="outline" className="text-[10px]">{plan.slug}</Badge>
            <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
          </div>
        </div>
        <Badge className={plan.isActive ? "bg-emerald/15 text-emerald border-0" : "bg-secondary"}>
          {plan.isActive ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      <div className="mb-4">
        <div className="text-xs text-muted-foreground">Preço mensal</div>
        <div className="font-display text-2xl font-bold">{formatPrice(plan.priceMonthly)}</div>
        {plan.setupFee > 0 && (
          <div className="text-xs text-muted-foreground">+ {formatPrice(plan.setupFee)} implantação</div>
        )}
      </div>

      <div className="space-y-1.5 text-xs border-t border-border pt-3">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Limites</div>
        <LimitRow label="Usuários" value={plan.maxUsers} />
        <LimitRow label="Imóveis" value={plan.maxProperties} />
        <LimitRow label="Leads/mês" value={plan.maxLeadsPerMonth} />
        <LimitRow label="Formulários" value={plan.maxCustomForms} />
        <FeatureRow label="CRM" value={plan.hasCrm} />
        <FeatureRow label="Dashboard avançado" value={plan.hasAdvancedDashboard} />
        <FeatureRow label="Branding próprio" value={plan.hasCustomBranding} />
        <FeatureRow label="Gestão de equipe" value={plan.hasTeamManagement} />
        <FeatureRow label="Distribuição de leads" value={plan.hasLeadDistribution} />
        <FeatureRow label="Suporte prioritário" value={plan.hasPrioritySupport} />
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {subscriberCount} assinante{subscriberCount !== 1 ? "s" : ""}
        </div>
      </div>
    </Card>
  );
}

function LimitRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value >= 9999 ? "ilimitado" : value}</span>
    </div>
  );
}

function FeatureRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <Badge className={value ? "bg-emerald/15 text-emerald border-0" : "bg-secondary border-0"}>
        {value ? "Sim" : "Não"}
      </Badge>
    </div>
  );
}

// ─── Lista de organizações ────────────────────────────────────────────────────

function OrgTable() {
  const queryClient = useQueryClient();
  const { data: orgs = [], isLoading, isError } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: () => getAdminOrganizations(),
    retry: 1,
  });
  const { data: availablePlans = [] } = useQuery({
    queryKey: ["available-plans"],
    queryFn: () => getAvailablePlans(),
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: (vars: { organizationId: string; planSlug: "free" | "pro" | "comercial" }) =>
      updateOrgPlan({ data: vars }),
    onSuccess: () => {
      toast.success("Plano atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-finance-metrics"] });
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <AlertCircle className="h-4 w-4 text-destructive" />
        Erro ao carregar organizações. Recarregue a página.
      </div>
    );
  }

  // Deduplicação já feita no servidor; garante no cliente como segurança extra
  const seen = new Set<string>();
  const uniqueOrgs = orgs.filter((row) => {
    if (seen.has(row.org.id)) return false;
    seen.add(row.org.id);
    return true;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b border-border">
          <tr>
            <th className="text-left py-2 pr-4">Organização</th>
            <th className="text-left py-2 pr-4">Responsável</th>
            <th className="text-left py-2 pr-4">Plano atual</th>
            <th className="text-left py-2 pr-4">Status</th>
            <th className="text-left py-2">Alterar plano</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {uniqueOrgs.map((row) => (
            <tr key={row.org.id} className="hover:bg-secondary/30">
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{row.org.name}</span>
                </div>
              </td>
              <td className="py-2.5 pr-4">
                <div className="text-xs">
                  <div>{row.ownerName ?? "—"}</div>
                  <div className="text-muted-foreground">{row.ownerEmail ?? ""}</div>
                </div>
              </td>
              <td className="py-2.5 pr-4">
                <Badge className={PLAN_COLORS[row.plan?.slug ?? "free"] + " border-0"}>
                  {row.plan?.name ?? "Free"}
                </Badge>
              </td>
              <td className="py-2.5 pr-4">
                <Badge className={
                  row.org.subscriptionStatus === "active" ? "bg-emerald/15 text-emerald border-0" :
                  row.org.subscriptionStatus === "past_due" ? "bg-destructive/15 text-destructive border-0" :
                  "bg-secondary border-0"
                }>
                  {row.org.subscriptionStatus}
                </Badge>
              </td>
              <td className="py-2.5">
                <select
                  className="text-xs border border-border rounded px-2 py-1 bg-background"
                  value={row.plan?.slug ?? "free"}
                  onChange={(e) =>
                    mutation.mutate({
                      organizationId: row.org.id,
                      planSlug: e.target.value as "free" | "pro" | "comercial",
                    })
                  }
                  disabled={mutation.isPending}
                >
                  {availablePlans.map((p) => (
                    <option key={p.id} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
          {uniqueOrgs.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                Nenhuma organização cadastrada ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

function AdminPlans() {
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["available-plans"],
    queryFn: () => getAvailablePlans(),
  });
  const { data: orgs = [] } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: () => getAdminOrganizations(),
  });

  const subscriberCounts = plans.reduce<Record<string, number>>((acc, p) => {
    acc[p.id] = orgs.filter((o) => o.org.planId === p.id).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Planos</h1>
          <p className="text-sm text-muted-foreground">
            Planos disponíveis na plataforma e assinantes ativos.
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Layers className="h-3.5 w-3.5 mr-1.5" /> Exportar
        </Button>
      </div>

      {/* Cards dos planos */}
      {plansLoading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} subscriberCount={subscriberCounts[plan.id] ?? 0} />
          ))}
        </div>
      )}

      {/* Tabela de orgs */}
      <Card className="p-5">
        <h2 className="font-semibold text-sm mb-4">Organizações e planos atribuídos</h2>
        <OrgTable />
      </Card>

      <Card className="p-5 text-xs text-muted-foreground">
        <strong className="text-foreground">Trial:</strong> novos usuários entram no Plano Free automaticamente.
        Para ativar trial, altere o status da organização manualmente ou configure via Stripe webhook.
      </Card>
    </div>
  );
}
