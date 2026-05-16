import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Link2, Zap, Image, Eye, AlertTriangle } from "lucide-react";
import { getLeads } from "@/server-fns/leads";
import { loadAdminSubscriptions } from "@/lib/admin-platform-store";

export const Route = createFileRoute("/admin/uso")({
  component: AdminUsage,
});

function AdminUsage() {
  const [topLeads, setTopLeads] = useState<{ name: string; email: string; count: number }[]>([]);
  const [totals, setTotals] = useState({ leads: 0, links: 0, automations: 0, uploads: 0, visits: 0 });

  useEffect(() => {
    (async () => {
      const leads = await getLeads();
      const grouped = new Map<string, { count: number; name: string; email: string }>();
      leads.forEach((l: any) => {
        const key = l.brokerName || "—";
        const cur = grouped.get(key) || { count: 0, name: key, email: l.brokerEmail || "" };
        cur.count++;
        grouped.set(key, cur);
      });
      const subs = loadAdminSubscriptions();
      setTopLeads(Array.from(grouped.values()).sort((a, b) => b.count - a.count).slice(0, 8));
      setTotals({
        leads: leads.length,
        links: subs.length,
        automations: Math.floor(subs.length * 1.5),
        uploads: Math.floor(subs.length * 4),
        visits: Math.floor(leads.length * 7.3),
      });
    })();
  }, []);

  return (
    <div className="space-y-5 max-w-[1300px]">
      <div>
        <h1 className="font-display text-2xl font-semibold">Uso da plataforma</h1>
        <p className="text-sm text-muted-foreground">Métricas de utilização por corretor e por recurso.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat icon={Activity} label="Leads totais" value={totals.leads} />
        <Stat icon={Link2} label="Links ativos" value={totals.links} />
        <Stat icon={Zap} label="Automações disparadas" value={totals.automations} accent="text-gold" />
        <Stat icon={Image} label="Uploads" value={totals.uploads} />
        <Stat icon={Eye} label="Visitas (páginas públicas)" value={totals.visits} accent="text-emerald" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Top corretores por leads capturados</h3>
          {topLeads.length === 0 ? (
            <div className="text-xs text-muted-foreground py-3">Sem dados ainda.</div>
          ) : (
            <div className="space-y-2.5">
              {topLeads.map((t, i) => {
                const max = topLeads[0].count;
                const pct = (t.count / max) * 100;
                return (
                  <div key={t.name + i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">/{t.name}</span>
                      <span className="text-muted-foreground">{t.count} leads</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-navy" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Consumo por plano</h3>
          <ConsumoRow label="Gratuito" pct={20} color="bg-muted-foreground/40" detail="Limitado a 3 imóveis e 2 agendas" />
          <ConsumoRow label="Pro" pct={65} color="bg-navy" detail="Recursos ilimitados de operação" />
          <ConsumoRow label="Comercial IA" pct={85} color="bg-gold" detail="Operação + IA integrada" />
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Limites excedidos</h3>
          <Badge className="bg-destructive/15 text-destructive border-0">Atenção</Badge>
        </div>
        <div className="space-y-2 text-sm">
          <ExceedRow icon={AlertTriangle} label="3 corretores Free atingiram limite de imóveis" hint="Sugestão: oferecer upgrade para Pro" />
          <ExceedRow icon={AlertTriangle} label="1 corretor Free atingiu limite de agenda" hint="Conversão potencial" />
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className={`mt-1 font-display text-xl font-semibold ${accent || ""}`}>{value}</div>
    </Card>
  );
}

function ConsumoRow({ label, pct, color, detail }: any) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1"><span className="font-medium">{label}</span><span className="text-muted-foreground">{pct}%</span></div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-1"><div className={`h-full ${color}`} style={{ width: `${pct}%` }} /></div>
      <div className="text-[10px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function ExceedRow({ icon: Icon, label, hint }: any) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/5 border border-destructive/20">
      <Icon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}
