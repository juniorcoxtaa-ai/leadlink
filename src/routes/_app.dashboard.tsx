import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  Users, TrendingUp, Clock, Plus, Sparkles, ArrowUpRight, ArrowDownRight,
  Home, Calendar, MoveRight, Phone, MessageCircle,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { statusBadgeClass } from "@/lib/status";
import { STATUS_LABEL } from "@/lib/lead-constants";
import { getDashboardData } from "@/server-fns/dashboard";
import { fmtBRL } from "@/lib/money";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Visão geral — Leadlink" }] }),
  loader: () => getDashboardData(),
  pendingComponent: DashboardSkeleton,
  component: Dashboard,
});

function Kpi({
  icon: Icon, label, value, delta, positive = true, hint,
}: {
  icon: any; label: string; value: string; delta: string; positive?: boolean; hint?: string;
}) {
  return (
    <Card className="p-5 border-border/70 hover:shadow-soft transition-all bg-card group">
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-emerald/10 transition-colors">
          <Icon className="h-[18px] w-[18px] text-foreground/70 group-hover:text-emerald transition-colors" />
        </div>
        <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${positive ? "text-emerald bg-emerald/10" : "text-destructive bg-destructive/10"}`}>
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </div>
      </div>
      <div className="mt-5">
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.14em] font-medium">{label}</div>
        <div className="font-display text-[34px] leading-none font-semibold tracking-tight mt-1.5">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1.5">{hint}</div>}
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-7 max-w-[1500px] mx-auto">
      <Card className="p-6 md:p-8 border-border/70">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-10 w-full max-w-xl mb-3" />
        <Skeleton className="h-10 w-64" />
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item} className="p-5 border-border/70">
            <Skeleton className="h-10 w-10 rounded-xl mb-5" />
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-36" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="p-6 lg:col-span-3"><Skeleton className="h-[260px] w-full" /></Card>
        <Card className="p-6 lg:col-span-2"><Skeleton className="h-[260px] w-full" /></Card>
      </div>
    </div>
  );
}

function Dashboard() {
  const data = Route.useLoaderData();
  const { kpis, funnel, leadsOverTime, recentLeads, featuredProperties, todayAppointments, brokerStats } = data;
  const vgv: number | undefined = (data as any).vgv;
  const { user } = Route.useRouteContext() as any;
  const [isClient, setIsClient] = useState(false);
  const firstName = (user as any)?.name?.split(" ")[0] || "Usuário";

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="space-y-7 max-w-[1500px] mx-auto">
      {/* Hero */}
      <Card className="relative overflow-hidden border-border/70 bg-card texture-paper p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="divider-ornament"><span>Painel da corretora</span></div>
            <h2 className="font-display text-3xl md:text-[40px] leading-[1.05] font-semibold tracking-tight">
              Bom te ver, <span className="italic text-emerald">{firstName}</span>.
              <br />
              <span className="text-foreground/70 text-2xl md:text-[28px] font-normal">
                Você tem{" "}
                <span className="font-semibold text-foreground">{todayAppointments.length} compromissos</span>{" "}
                hoje.
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button className="bg-navy text-navy-foreground hover:bg-navy/90 rounded-full h-10 px-5">
                <Plus className="h-4 w-4 mr-1.5" /> Novo lead
              </Button>
              <Button variant="outline" className="rounded-full h-10 px-5 border-border/80" asChild>
                <Link to="/agenda"><Calendar className="h-4 w-4 mr-1.5" /> Ver agenda</Link>
              </Button>
              <Button variant="ghost" className="rounded-full h-10 px-4 text-muted-foreground hover:text-foreground" asChild>
                <Link to="/imoveis">Portfólio <MoveRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">VGV em aberto</div>
              <div className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-emerald">
                {fmtBRL(vgv ?? 0)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Leads ativos" value={(kpis.total ?? 0).toLocaleString("pt-BR")} delta="+12%" hint="vs. 30 dias anteriores" />
        <Kpi icon={Sparkles} label="Novos hoje" value={String(kpis.today)} delta="+3" hint="Distribuídos na equipe" />
        <Kpi icon={TrendingUp} label="Conversão" value={`${kpis.conversion}%`} delta="+2.1pp" hint="Acima da média do escritório" />
        <Kpi icon={Clock} label="Resposta média" value={kpis.responseTime} delta="-2min" hint="Tempo até primeiro contato" />
      </div>

      {/* Pipeline + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="p-6 lg:col-span-3 border-border/70">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-xl font-semibold">Funil de pipeline</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Visão rápida do fluxo comercial</p>
            </div>
            <Badge variant="secondary" className="bg-secondary text-muted-foreground rounded-full font-normal">Tempo real</Badge>
          </div>
          <div className="space-y-3">
            {(funnel ?? []).map((row: any, i: any) => {
              const max = Math.max(...(funnel ?? []).map((f: any) => f.value), 1);
              const pct = (row.value / max) * 100;
              const colors = ["bg-navy", "bg-emerald", "bg-gold", "bg-foreground/60", "bg-muted-foreground/60", "bg-success"];
              const label = STATUS_LABEL[row.status as keyof typeof STATUS_LABEL] || row.status;
              return (
                <div key={row.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{label}</span>
                    <span className="font-mono text-foreground/80 text-xs">{row.value} leads</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${colors[i % colors.length]} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {(!funnel || funnel.length === 0) && (
              <EmptyState
                icon={<TrendingUp className="h-5 w-5" />}
                title="Sem dados de funil ainda"
                description="Quando os leads começarem a avançar, a distribuição por etapa aparece aqui."
                className="py-8"
              />
            )}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2 border-border/70">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display text-xl font-semibold">Captura de leads</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Últimas 2 semanas</p>
            </div>
          </div>
          <div className="h-[220px] -mx-2">
            {isClient ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadsOverTime} margin={{ left: 0, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-emerald)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--color-emerald)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", fontSize: 12 }} />
                  <Area type="monotone" dataKey="leads" stroke="var(--color-emerald)" fill="url(#g1)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-secondary/40 animate-pulse" />
            )}
          </div>
        </Card>
      </div>

      {/* Imóveis + Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 border-border/70 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-xl font-semibold">Imóveis em destaque</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Mais visualizados esta semana</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/imoveis">Ver portfólio →</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(featuredProperties ?? []).map((p: any) => (
              <div key={p.id} className="group cursor-pointer">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-secondary mb-3">
                  {p.image && (
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  )}
                  {p.highlight && (
                    <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-full bg-navy/90 text-gold text-[10px] font-medium uppercase tracking-wider backdrop-blur">
                      {p.highlight}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{p.neighborhood}</div>
                  <div className="font-medium text-sm leading-tight line-clamp-1">{p.title}</div>
                  <div className="font-display text-base font-semibold text-emerald">{fmtBRL(p.price)}</div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                    <span>{p.bedrooms} dorm</span>·<span>{p.area}m²</span>·<span>{p.parking} vagas</span>
                  </div>
                </div>
              </div>
            ))}
            {(!featuredProperties || featuredProperties.length === 0) && (
              <div className="sm:col-span-3">
                <EmptyState
                  icon={<Home className="h-5 w-5" />}
                  title="Nenhum imóvel em destaque"
                  description="Cadastre seus primeiros imóveis para acompanhar visualizações e VGV por aqui."
                  action={<Button asChild size="sm"><Link to="/imoveis">Cadastrar primeiro imóvel</Link></Button>}
                  className="py-8"
                />
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 border-border/70">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-xl font-semibold">Hoje</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/agenda">Agenda →</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {(todayAppointments.length ? todayAppointments : []).slice(0, 4).map((a: any) => (
              <div key={a.id} className="flex gap-3 p-3 -mx-1 rounded-xl hover:bg-secondary/60 transition-colors cursor-pointer">
                <div className="text-center shrink-0 w-12 pt-0.5">
                  <div className="font-display text-lg font-semibold leading-none">{new Date(a.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider mt-1">{a.duration}min</div>
                </div>
                <div className="w-px bg-border" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-[10px] font-normal h-4 px-1.5 border-emerald/30 text-emerald bg-emerald/5">{a.type}</Badge>
                  </div>
                  <div className="font-medium text-sm leading-tight">{a.leadName}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.propertyTitle || a.location}</div>
                </div>
              </div>
            ))}
            {todayAppointments.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-6">Nenhum compromisso hoje</div>
            )}
          </div>
        </Card>
      </div>

      {/* Leads recentes */}
      <Card className="overflow-hidden border-border/70">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="font-display text-xl font-semibold">Leads recentes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Últimas oportunidades capturadas</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/leads">Todos os leads →</Link>
          </Button>
        </div>
        <div className="divide-y divide-border">
          {(recentLeads ?? []).map((l: any) => (
            <Link
              key={l.id}
              to="/leads/$leadId"
              params={{ leadId: l.id }}
              className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/40 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-secondary text-foreground text-xs font-semibold">
                  {l.name.split(" ").map((n: any) => n[0]).slice(0, 2).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{l.name}</span>
                  <Badge variant="outline" className="text-[10px] font-normal border-border/80">{l.source}</Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{l.interest} · {l.budget}</div>
              </div>
              <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider">Score</div>
                  <div className="font-mono font-semibold text-foreground text-sm">{l.score}</div>
                </div>
              </div>
              <Badge className={`${statusBadgeClass(l.status)} rounded-full font-normal`}>{STATUS_LABEL[l.status as keyof typeof STATUS_LABEL] || l.status}</Badge>
              <Avatar className="h-8 w-8 hidden sm:flex ring-1 ring-border">
                <AvatarFallback className="bg-navy text-gold text-[10px] font-semibold">
                  {l.brokerInitials || l.brokerName?.split(" ").map((n: any) => n[0]).join("").slice(0, 2) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full"><MessageCircle className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full"><Phone className="h-4 w-4" /></Button>
              </div>
            </Link>
          ))}
          {(!recentLeads || recentLeads.length === 0) && (
            <div className="p-6">
              <EmptyState
                icon={<Users className="h-5 w-5" />}
                title="Nenhum lead capturado ainda"
                description="Compartilhe seu Meu Link para começar a receber leads qualificados."
                action={<Button asChild size="sm"><Link to="/meu-link">Abrir Meu Link</Link></Button>}
                className="py-8"
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
