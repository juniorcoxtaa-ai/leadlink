import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  CreditCard,
  DollarSign,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { getAdminPlatformMetrics } from "@/server-fns/admin";
import { getDashboardData } from "@/server-fns/dashboard";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

type RecentLead = {
  id: string;
  name: string;
  source: string;
  status: string;
};

function AdminOverview() {
  const { data: metrics } = useQuery({
    queryKey: ["admin-platform-metrics"],
    queryFn: () => getAdminPlatformMetrics(),
  });
  const { data: dashboard } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => getDashboardData(),
  });

  const users = metrics?.totalUsers ?? 0;
  const paid = (metrics?.proUsers ?? 0) + (metrics?.comercialIaUsers ?? 0);
  const churn =
    users > 0
      ? (
          ((metrics?.canceledUsers ?? 0) / Math.max(1, paid + (metrics?.canceledUsers ?? 0))) *
          100
        ).toFixed(1)
      : "0.0";
  const mrr = metrics?.mrrCents ?? 0;

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h1 className="font-display text-2xl font-semibold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Métricas da plataforma Lead Link.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          icon={Users}
          label="Total de usuários"
          value={users}
          hint={`Bloqueados: ${metrics?.blockedUsers ?? 0}`}
        />
        <Stat
          icon={UserPlus}
          label="Novos (30d)"
          value={metrics?.newUsers30d ?? 0}
          accent="text-emerald"
        />
        <Stat
          icon={CreditCard}
          label="Pagos"
          value={paid}
          hint={`${metrics?.proUsers ?? 0} Pro · ${metrics?.comercialIaUsers ?? 0} IA`}
        />
        <Stat
          icon={DollarSign}
          label="MRR estimado"
          value={`R$ ${(mrr / 100).toLocaleString("pt-BR")}`}
          accent="text-emerald"
        />
        <Stat icon={TrendingUp} label="Leads 30d" value={metrics?.leads30d ?? 0} />
        <Stat
          icon={ArrowUpRight}
          label="Usuários Pro"
          value={metrics?.proUsers ?? 0}
          accent="text-navy"
        />
        <Stat
          icon={ArrowDownRight}
          label="Cancelados"
          value={metrics?.canceledUsers ?? 0}
          accent="text-destructive"
        />
        <Stat icon={Activity} label="Imóveis" value={metrics?.propertiesTotal ?? 0} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Distribuição de planos</h3>
          <Bar
            label="Free"
            value={metrics?.freeUsers ?? 0}
            total={users}
            color="bg-muted-foreground/40"
          />
          <Bar label="Pro" value={metrics?.proUsers ?? 0} total={users} color="bg-navy" />
          <Bar
            label="Comercial IA"
            value={metrics?.comercialIaUsers ?? 0}
            total={users}
            color="bg-gold"
          />
          <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
            Conversão para pago:{" "}
            <span className="font-medium text-foreground">
              {users ? ((paid / users) * 100).toFixed(1) : "0"}%
            </span>
          </div>
        </Card>

        <Card className="p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Atalhos</h3>
            <Link to="/admin/usuarios" className="text-xs text-navy hover:underline">
              Abrir usuários →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-4 border-border/70 bg-secondary/20">
              <div className="text-xs text-muted-foreground">Past due</div>
              <div className="text-2xl font-semibold text-destructive">
                {metrics?.pastDueUsers ?? 0}
              </div>
            </Card>
            <Card className="p-4 border-border/70 bg-secondary/20">
              <div className="text-xs text-muted-foreground">Bloqueados</div>
              <div className="text-2xl font-semibold text-amber-600">
                {metrics?.blockedUsers ?? 0}
              </div>
            </Card>
            <Card className="p-4 border-border/70 bg-secondary/20">
              <div className="text-xs text-muted-foreground">Churn</div>
              <div className="text-2xl font-semibold">{churn}%</div>
            </Card>
            <Card className="p-4 border-border/70 bg-secondary/20">
              <div className="text-xs text-muted-foreground">Leads capturados</div>
              <div className="text-2xl font-semibold">{metrics?.leads30d ?? 0}</div>
            </Card>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3">Resumo operacional</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {(dashboard?.recentLeads ?? []).slice(0, 6).map((lead: RecentLead) => (
            <div key={lead.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="font-medium">{lead.name}</div>
              <div className="text-xs text-muted-foreground">
                {lead.source} · {lead.status}
              </div>
            </div>
          ))}
        </div>
        {(!dashboard?.recentLeads || dashboard.recentLeads.length === 0) && (
          <EmptyState
            icon={<Activity className="h-5 w-5" />}
            title="Sem atividade operacional ainda"
            description="Quando leads forem capturados, o resumo mais recente aparece neste painel."
            className="mt-3 py-8"
          />
        )}
      </Card>

      {metrics?.blockedUsers ? (
        <div className="flex items-center gap-2 text-sm rounded-lg border px-3 py-2 bg-destructive/5 border-destructive/30 text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Existem {metrics.blockedUsers} usuário(s)
          bloqueado(s) na plataforma.
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent?: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-semibold ${accent || ""}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </Card>
  );
}

function Bar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {value} · {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
