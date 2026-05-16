import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, FileText, AlertCircle, RotateCcw, Tag, Plus, Search, TrendingUp, Users, Building2 } from "lucide-react";
import { getAdminFinanceMetrics, getAdminOrganizations } from "@/server-fns/plans";
import { formatPrice } from "@/lib/plans";

export const Route = createFileRoute("/admin/financeiro")({
  component: AdminFinance,
});

const TABS = [
  { id: "overview", label: "Visão geral" },
  { id: "orgs", label: "Clientes" },
  { id: "coupons", label: "Cupons" },
];

function AdminFinance() {
  const [tab, setTab] = useState("overview");

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["admin-finance-metrics"],
    queryFn: () => getAdminFinanceMetrics(),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: () => getAdminOrganizations(),
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000, // re-fetch every minute to pick up Stripe webhook updates
  });

  const mrr = metrics?.mrrCents ?? 0;
  const arr = metrics?.arrCents ?? mrr * 12;
  const totalOrgs = metrics?.totalOrganizations ?? 0;
  const byPlan = metrics?.byPlan ?? { free: 0, pro: 0, comercial: 0 };
  const activeCount = metrics?.activeSubscriptions ?? 0;

  return (
    <div className="space-y-5 max-w-[1300px]">
      <div>
        <h1 className="font-display text-2xl font-semibold">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Receita, clientes, assinaturas e cobranças.</p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-16" />
            </Card>
          ))
        ) : (
          <>
            <Stat icon={DollarSign} label="MRR" value={formatPrice(mrr)} accent="text-emerald" />
            <Stat icon={TrendingUp} label="ARR estimado" value={formatPrice(arr)} accent="text-emerald" />
            <Stat icon={Users} label="Clientes ativos (pagantes)" value={activeCount} />
            <Stat icon={Building2} label="Total de organizações" value={totalOrgs} />
          </>
        )}
      </div>

      {/* Breakdown por plano */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <div className="text-2xl font-display font-bold">{byPlan.free}</div>
          <div className="text-xs text-muted-foreground mt-1">Plano Free</div>
        </Card>
        <Card className="p-4 text-center border-navy/30">
          <div className="text-2xl font-display font-bold text-navy">{byPlan.pro}</div>
          <div className="text-xs text-muted-foreground mt-1">Plano Pro</div>
        </Card>
        <Card className="p-4 text-center border-gold/30">
          <div className="text-2xl font-display font-bold text-gold">{byPlan.comercial}</div>
          <div className="text-xs text-muted-foreground mt-1">Plano Comercial</div>
        </Card>
      </div>

      {/* Abas */}
      <Card>
        <div className="border-b border-border flex items-center px-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? "border-navy text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "overview" && <RecentPayments payments={metrics?.recentPayments ?? []} loading={metricsLoading} />}
          {tab === "orgs" && <OrgList orgs={orgs} loading={orgsLoading} />}
          {tab === "coupons" && <CouponsTab />}
        </div>
      </Card>
    </div>
  );
}

function RecentPayments({ payments, loading }: { payments: any[]; loading: boolean }) {
  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  if (payments.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <div className="text-sm">Nenhum pagamento registrado ainda.</div>
        <div className="text-xs mt-1">Os pagamentos aparecerão aqui após integração com Stripe.</div>
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-muted-foreground border-b border-border">
        <tr>
          <th className="text-left py-2">ID</th>
          <th className="text-left py-2">Valor</th>
          <th className="text-left py-2">Status</th>
          <th className="text-left py-2">Data</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {payments.map((p: any) => (
          <tr key={p.id} className="hover:bg-secondary/30">
            <td className="py-2.5 font-mono text-xs">{p.stripePaymentIntentId ?? p.id.slice(0, 8)}</td>
            <td className="py-2.5 font-mono text-xs">{formatPrice(p.amountCents)}</td>
            <td className="py-2.5">
              <Badge className={
                p.status === "succeeded" ? "bg-emerald/15 text-emerald border-0" :
                p.status === "failed" ? "bg-destructive/15 text-destructive border-0" :
                "bg-secondary border-0"
              }>
                {p.status}
              </Badge>
            </td>
            <td className="py-2.5 text-xs">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OrgList({ orgs, loading }: { orgs: any[]; loading: boolean }) {
  const [search, setSearch] = useState("");

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  const seen = new Set<string>();
  const unique = orgs.filter((r) => {
    if (seen.has(r.org.id)) return false;
    seen.add(r.org.id);
    return true;
  });

  const filtered = search
    ? unique.filter(
        (r) =>
          r.org.name.toLowerCase().includes(search.toLowerCase()) ||
          r.ownerEmail?.toLowerCase().includes(search.toLowerCase()),
      )
    : unique;

  const STATUS_COLORS: Record<string, string> = {
    active:   "bg-emerald/15 text-emerald border-0",
    trialing: "bg-blue-500/15 text-blue-600 border-0",
    past_due: "bg-destructive/15 text-destructive border-0",
    canceled: "bg-secondary border-0",
    free:     "bg-secondary border-0",
  };

  const PLAN_COLORS: Record<string, string> = {
    free:      "bg-secondary border-0",
    pro:       "bg-navy/15 text-navy border-0",
    comercial: "bg-gold/15 text-amber-700 border-0",
  };

  return (
    <div>
      <div className="relative w-60 mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente…"
          className="pl-9 h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b border-border">
          <tr>
            <th className="text-left py-2 pr-4">Organização</th>
            <th className="text-left py-2 pr-4">E-mail</th>
            <th className="text-left py-2 pr-4">Plano</th>
            <th className="text-left py-2 pr-4">Status</th>
            <th className="text-left py-2 pr-4">Stripe</th>
            <th className="text-left py-2">Desde</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filtered.map((row) => (
            <tr key={row.org.id} className="hover:bg-secondary/30">
              <td className="py-2.5 pr-4 font-medium">{row.org.name}</td>
              <td className="py-2.5 pr-4 text-xs text-muted-foreground">{row.ownerEmail ?? "—"}</td>
              <td className="py-2.5 pr-4">
                <Badge className={PLAN_COLORS[row.plan?.slug ?? "free"]}>
                  {row.plan?.name ?? "Free"}
                </Badge>
              </td>
              <td className="py-2.5 pr-4">
                <Badge className={STATUS_COLORS[row.org.subscriptionStatus] ?? "bg-secondary border-0"}>
                  {row.org.subscriptionStatus}
                </Badge>
              </td>
              <td className="py-2.5 pr-4 text-xs font-mono">
                {(row.org as any).stripeCustomerId
                  ? <span className="text-emerald">cus_…{String((row.org as any).stripeCustomerId).slice(-4)}</span>
                  : <span className="text-muted-foreground/40">—</span>
                }
              </td>
              <td className="py-2.5 text-xs">
                {new Date(row.org.createdAt).toLocaleDateString("pt-BR")}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs">
                Nenhum cliente encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CouponsTab() {
  const coupons = [
    { code: "BEMVINDO10", discount: "10%", uses: 0, expires: "—", active: true },
    { code: "BLACK2026", discount: "30%", uses: 0, expires: "30/11/2026", active: false },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="relative w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cupom…" className="pl-9 h-9" />
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" /> Novo cupom</Button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b border-border">
          <tr>
            <th className="text-left py-2">Código</th>
            <th className="text-left py-2">Desconto</th>
            <th className="text-left py-2">Usos</th>
            <th className="text-left py-2">Vencimento</th>
            <th className="text-left py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {coupons.map((c) => (
            <tr key={c.code}>
              <td className="py-2.5 font-mono text-xs"><Tag className="h-3.5 w-3.5 inline mr-1.5" />{c.code}</td>
              <td className="py-2.5">{c.discount}</td>
              <td className="py-2.5">{c.uses}</td>
              <td className="py-2.5 text-xs">{c.expires}</td>
              <td className="py-2.5">
                <Badge className={c.active ? "bg-emerald/15 text-emerald border-0" : "bg-secondary border-0"}>
                  {c.active ? "ativo" : "inativo"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 font-display text-xl font-semibold ${accent ?? ""}`}>{value}</div>
    </Card>
  );
}
