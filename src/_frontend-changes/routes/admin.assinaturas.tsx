import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/assinaturas")({
  component: AdminSubs,
});

const PLAN: Record<string, { label: string; cls: string }> = {
  free: { label: "Gratuito", cls: "bg-secondary text-foreground" },
  pro: { label: "Pro", cls: "bg-navy text-navy-foreground" },
  comercial_ia: { label: "Comercial IA", cls: "bg-gold text-navy" },
};

const STATUS: Record<string, string> = {
  active: "text-emerald", trial: "text-gold", past_due: "text-destructive", canceled: "text-muted-foreground",
};

function AdminSubs() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: subs }, { data: profiles }] = await Promise.all([
        supabase.from("subscriptions").select("*").order("started_at", { ascending: false }),
        supabase.from("profiles").select("user_id,full_name,email"),
      ]);
      const map = new Map((profiles || []).map(p => [p.user_id, p]));
      setRows((subs || []).map(s => ({ ...s, profile: map.get(s.user_id) })));
    })();
  }, []);

  const totalMrr = rows.filter(r => r.status === "active").reduce((s, r) => s + (r.amount_cents || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Assinaturas</h1>
          <p className="text-sm text-muted-foreground">Todas as assinaturas ativas e histórico.</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">MRR estimado</div>
          <div className="font-display text-2xl font-semibold text-emerald">
            R$ {(totalMrr / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5">Cliente</th>
                <th className="text-left px-4 py-2.5">Plano</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Valor / mês</th>
                <th className="text-left px-4 py-2.5">Início</th>
                <th className="text-left px-4 py-2.5">Próx. cobrança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(r => {
                const p = PLAN[r.plan];
                return (
                  <tr key={r.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.profile?.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.profile?.email}</div>
                    </td>
                    <td className="px-4 py-3"><Badge className={p.cls}>{p.label}</Badge></td>
                    <td className={`px-4 py-3 text-xs font-medium ${STATUS[r.status]}`}>{r.status}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.amount_cents > 0 ? `R$ ${(r.amount_cents / 100).toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3 text-xs">{new Date(r.started_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-xs">{r.current_period_end ? new Date(r.current_period_end).toLocaleDateString("pt-BR") : "—"}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Sem assinaturas ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
