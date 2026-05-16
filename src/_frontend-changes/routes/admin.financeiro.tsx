import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, FileText, AlertCircle, RotateCcw, Tag, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/admin/financeiro")({
  component: AdminFinance,
});

const TABS = [
  { id: "invoices", label: "Faturas" },
  { id: "approved", label: "Pagos" },
  { id: "overdue", label: "Em atraso" },
  { id: "refunds", label: "Reembolsos" },
  { id: "coupons", label: "Cupons" },
];

function AdminFinance() {
  const [tab, setTab] = useState("invoices");
  const [subs, setSubs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from("subscriptions").select("*").order("started_at", { ascending: false }),
        supabase.from("profiles").select("user_id,full_name,email"),
      ]);
      setSubs(s || []);
      setProfiles(new Map((p || []).map(x => [x.user_id, x])));
    })();
  }, []);

  const paidSubs = subs.filter(s => s.status === "active" && s.amount_cents > 0);
  const overdueSubs = subs.filter(s => s.status === "past_due");
  const totalRevenue = paidSubs.reduce((sum, s) => sum + (s.amount_cents || 0), 0);
  const overdueAmount = overdueSubs.reduce((sum, s) => sum + (s.amount_cents || 0), 0);

  return (
    <div className="space-y-5 max-w-[1300px]">
      <div>
        <h1 className="font-display text-2xl font-semibold">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Cobranças, faturas, reembolsos e cupons.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={DollarSign} label="Receita / mês" value={`R$ ${(totalRevenue / 100).toLocaleString("pt-BR")}`} accent="text-emerald" />
        <Stat icon={FileText} label="Faturas ativas" value={paidSubs.length} />
        <Stat icon={AlertCircle} label="Inadimplência" value={`R$ ${(overdueAmount / 100).toLocaleString("pt-BR")}`} accent="text-destructive" />
        <Stat icon={RotateCcw} label="Reembolsos (30d)" value="0" />
      </div>

      <Card>
        <div className="border-b border-border flex items-center px-2 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? "border-navy text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "invoices" && <InvoiceList subs={subs} profiles={profiles} filter={() => true} />}
          {tab === "approved" && <InvoiceList subs={paidSubs} profiles={profiles} filter={() => true} />}
          {tab === "overdue" && <InvoiceList subs={overdueSubs} profiles={profiles} filter={() => true} />}
          {tab === "refunds" && <EmptyState icon={RotateCcw} label="Nenhum reembolso registrado" />}
          {tab === "coupons" && <CouponsTab />}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3">Meios de pagamento aceitos</h3>
        <div className="flex flex-wrap gap-2">
          {["Pix", "Cartão de crédito", "Boleto", "Apple Pay", "Google Pay"].map(m => (
            <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}

function InvoiceList({ subs, profiles, filter }: any) {
  const rows = subs.filter(filter);
  if (rows.length === 0) return <EmptyState icon={FileText} label="Nenhuma fatura encontrada" />;
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-muted-foreground border-b border-border">
        <tr>
          <th className="text-left py-2">Cliente</th>
          <th className="text-left py-2">Valor</th>
          <th className="text-left py-2">Status</th>
          <th className="text-left py-2">Data</th>
          <th className="text-left py-2">Vencimento</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((s: any) => {
          const p = profiles.get(s.user_id);
          return (
            <tr key={s.id} className="hover:bg-secondary/30">
              <td className="py-2.5">
                <div className="font-medium">{p?.full_name || "—"}</div>
                <div className="text-xs text-muted-foreground">{p?.email}</div>
              </td>
              <td className="py-2.5 font-mono text-xs">R$ {((s.amount_cents || 0) / 100).toFixed(2)}</td>
              <td className="py-2.5">
                <Badge className={s.status === "active" ? "bg-emerald/15 text-emerald border-0" : s.status === "past_due" ? "bg-destructive/15 text-destructive border-0" : "bg-secondary"}>
                  {s.status}
                </Badge>
              </td>
              <td className="py-2.5 text-xs">{new Date(s.started_at).toLocaleDateString("pt-BR")}</td>
              <td className="py-2.5 text-xs">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("pt-BR") : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CouponsTab() {
  const [coupons] = useState([
    { code: "BEMVINDO10", discount: "10%", uses: 0, expires: "—", active: true },
    { code: "BLACK2026", discount: "30%", uses: 0, expires: "30/11/2026", active: false },
  ]);
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
          <tr><th className="text-left py-2">Código</th><th className="text-left py-2">Desconto</th><th className="text-left py-2">Usos</th><th className="text-left py-2">Vencimento</th><th className="text-left py-2">Status</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {coupons.map(c => (
            <tr key={c.code}>
              <td className="py-2.5 font-mono text-xs"><Tag className="h-3.5 w-3.5 inline mr-1.5" />{c.code}</td>
              <td className="py-2.5">{c.discount}</td>
              <td className="py-2.5">{c.uses}</td>
              <td className="py-2.5 text-xs">{c.expires}</td>
              <td className="py-2.5"><Badge className={c.active ? "bg-emerald/15 text-emerald border-0" : "bg-secondary"}>{c.active ? "ativo" : "inativo"}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
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

function EmptyState({ icon: Icon, label }: any) {
  return (
    <div className="text-center py-10 text-muted-foreground">
      <Icon className="h-8 w-8 mx-auto mb-2 opacity-40" />
      <div className="text-sm">{label}</div>
    </div>
  );
}
