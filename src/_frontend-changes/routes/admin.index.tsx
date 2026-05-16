import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, CreditCard, TrendingUp, DollarSign, UserPlus, ArrowUpRight,
  ArrowDownRight, AlertTriangle, Activity, CalendarRange,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const [stats, setStats] = useState({
    users: 0, free: 0, pro: 0, ia: 0, mrr: 0, leads: 0,
    new7d: 0, new30d: 0, activeSubs: 0, canceled: 0, pastDue: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<{ kind: "warn" | "info"; text: string }[]>([]);

  useEffect(() => {
    (async () => {
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const [{ count: users }, { data: subs }, { count: leads }, { data: latest }, { count: new7d }, { count: new30d }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("plan,amount_cents,status,current_period_end"),
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(6),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since7),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since30),
      ]);
      const free = subs?.filter(s => s.plan === "free").length ?? 0;
      const pro = subs?.filter(s => s.plan === "pro").length ?? 0;
      const ia = subs?.filter(s => s.plan === "comercial_ia").length ?? 0;
      const activeSubs = subs?.filter(s => s.status === "active" && s.plan !== "free").length ?? 0;
      const canceled = subs?.filter(s => s.status === "canceled").length ?? 0;
      const pastDue = subs?.filter(s => s.status === "past_due").length ?? 0;
      const mrr = subs?.filter(s => s.status === "active").reduce((s, x) => s + (x.amount_cents || 0), 0) ?? 0;

      setStats({
        users: users || 0, free, pro, ia, mrr, leads: leads || 0,
        new7d: new7d || 0, new30d: new30d || 0, activeSubs, canceled, pastDue,
      });
      setRecent(latest || []);

      // Alerts
      const a: { kind: "warn" | "info"; text: string }[] = [];
      if (pastDue > 0) a.push({ kind: "warn", text: `${pastDue} assinatura(s) com pagamento em atraso` });
      const expiringSoon = subs?.filter(s => {
        if (!s.current_period_end || s.plan === "free") return false;
        const d = new Date(s.current_period_end).getTime();
        return d > Date.now() && d < Date.now() + 7 * 86400000;
      }).length ?? 0;
      if (expiringSoon > 0) a.push({ kind: "info", text: `${expiringSoon} assinatura(s) vencem nos próximos 7 dias` });
      if ((new7d || 0) === 0) a.push({ kind: "info", text: "Nenhum novo cadastro nos últimos 7 dias" });
      setAlerts(a);
    })();
  }, []);

  const churn = stats.activeSubs + stats.canceled > 0
    ? ((stats.canceled / (stats.activeSubs + stats.canceled)) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h1 className="font-display text-2xl font-semibold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Métricas em tempo real da plataforma Leadlink.</p>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 ${a.kind === "warn" ? "bg-destructive/5 border-destructive/30 text-destructive" : "bg-secondary/60 border-border text-foreground"}`}>
              <AlertTriangle className="h-4 w-4 shrink-0" /> {a.text}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Users} label="Total de corretores" value={stats.users} hint={`${stats.new30d} nos últimos 30d`} />
        <Stat icon={UserPlus} label="Novos (7d)" value={stats.new7d} accent="text-emerald" />
        <Stat icon={CreditCard} label="Assinaturas pagas" value={stats.activeSubs} hint={`${stats.pro} Pro · ${stats.ia} IA`} />
        <Stat icon={DollarSign} label="MRR" value={`R$ ${(stats.mrr / 100).toLocaleString("pt-BR")}`} accent="text-emerald" />
        <Stat icon={ArrowUpRight} label="Upgrades (mês)" value={stats.pro + stats.ia} accent="text-navy" hint="estimado" />
        <Stat icon={ArrowDownRight} label="Cancelamentos" value={stats.canceled} accent="text-destructive" />
        <Stat icon={TrendingUp} label="Churn" value={`${churn}%`} accent="text-gold" />
        <Stat icon={Activity} label="Leads capturados" value={stats.leads} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Distribuição de planos</h3>
          <Bar label="Gratuito" value={stats.free} total={stats.users} color="bg-muted-foreground/40" />
          <Bar label="Pro" value={stats.pro} total={stats.users} color="bg-navy" />
          <Bar label="Comercial IA" value={stats.ia} total={stats.users} color="bg-gold" />
          <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
            Conversão para pago: <span className="font-medium text-foreground">{stats.users ? ((stats.activeSubs / stats.users) * 100).toFixed(1) : "0"}%</span>
          </div>
        </Card>

        <Card className="p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Últimos cadastros</h3>
            <Link to="/admin/usuarios" className="text-xs text-navy hover:underline">Ver todos →</Link>
          </div>
          <div className="divide-y divide-border">
            {recent.map((p) => (
              <Link key={p.id} to="/admin/corretores/$userId" params={{ userId: p.user_id }} className="py-2.5 flex items-center justify-between text-sm hover:bg-secondary/40 -mx-2 px-2 rounded">
                <div>
                  <div className="font-medium">{p.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{p.email}</div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</div>
              </Link>
            ))}
            {recent.length === 0 && <div className="text-sm text-muted-foreground py-4">Nenhum cadastro ainda.</div>}
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><CalendarRange className="h-3.5 w-3.5" /> Uso por período</div>
          <div className="font-display text-2xl font-semibold">{stats.new30d}</div>
          <div className="text-xs text-muted-foreground">novos cadastros · 30 dias</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><AlertTriangle className="h-3.5 w-3.5" /> Atrasos</div>
          <div className="font-display text-2xl font-semibold text-destructive">{stats.pastDue}</div>
          <div className="text-xs text-muted-foreground">assinaturas em atraso</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><TrendingUp className="h-3.5 w-3.5" /> Receita anual estimada</div>
          <div className="font-display text-2xl font-semibold text-emerald">R$ {((stats.mrr * 12) / 100).toLocaleString("pt-BR")}</div>
          <Badge className="bg-emerald/15 text-emerald border-0 mt-1">ARR projetado</Badge>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent, hint }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold ${accent || ""}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </Card>
  );
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1"><span>{label}</span><span className="text-muted-foreground">{value} · {pct.toFixed(0)}%</span></div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
