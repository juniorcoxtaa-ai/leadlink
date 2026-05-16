import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Shield, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/usuarios")({
  component: AdminUsers,
});

interface Row {
  id: string; user_id: string;
  full_name: string | null; email: string | null; phone: string | null; city: string | null;
  created_at: string; updated_at: string;
  plan: string; status: string; amount_cents: number; current_period_end: string | null;
  is_admin: boolean;
}

const PLAN_LABEL: Record<string, { label: string; cls: string }> = {
  free: { label: "Gratuito", cls: "bg-secondary text-foreground" },
  pro: { label: "Pro", cls: "bg-navy text-navy-foreground" },
  comercial_ia: { label: "Comercial IA", cls: "bg-gold text-navy" },
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald", trial: "bg-gold", past_due: "bg-destructive", canceled: "bg-muted-foreground",
};

function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: subs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*"),
      supabase.from("user_roles").select("user_id,role").eq("role", "admin"),
    ]);
    const subMap = new Map((subs || []).map(s => [s.user_id, s]));
    const adminSet = new Set((roles || []).map(r => r.user_id));
    setRows((profiles || []).map(p => {
      const s = subMap.get(p.user_id);
      return {
        id: p.id, user_id: p.user_id, full_name: p.full_name, email: p.email, phone: p.phone,
        city: p.city, created_at: p.created_at, updated_at: p.updated_at,
        plan: s?.plan || "free", status: s?.status || "active",
        amount_cents: s?.amount_cents || 0, current_period_end: s?.current_period_end || null,
        is_admin: adminSet.has(p.user_id),
      };
    }));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (planFilter !== "all" && r.plan !== planFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return [r.full_name, r.email, r.phone, r.city].some(v => v?.toLowerCase().includes(s));
  }), [rows, q, planFilter, statusFilter]);

  const changePlan = async (user_id: string, plan: "free" | "pro" | "comercial_ia") => {
    const amount = plan === "pro" ? 9700 : plan === "comercial_ia" ? 19700 : 0;
    const next = plan === "free" ? null : new Date(Date.now() + 30 * 86400000).toISOString();
    const { error } = await supabase.from("subscriptions")
      .update({ plan, amount_cents: amount, current_period_end: next, status: "active" })
      .eq("user_id", user_id);
    if (error) return toast.error(error.message);
    toast.success("Plano atualizado");
    load();
  };

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Corretores</h1>
          <p className="text-sm text-muted-foreground">{rows.length} cadastrados · {filtered.length} exibidos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="text-xs border border-border bg-background rounded-md px-2 py-1.5 h-9">
            <option value="all">Todos os planos</option>
            <option value="free">Gratuito</option>
            <option value="pro">Pro</option>
            <option value="comercial_ia">Comercial IA</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border border-border bg-background rounded-md px-2 py-1.5 h-9">
            <option value="all">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="past_due">Em atraso</option>
            <option value="canceled">Cancelado</option>
            <option value="trial">Trial</option>
          </select>
          <div className="relative w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, e-mail…" className="pl-9 h-9" />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5">Corretor</th>
                <th className="text-left px-4 py-2.5">Contato</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Plano</th>
                <th className="text-left px-4 py-2.5">Cadastro</th>
                <th className="text-left px-4 py-2.5">Última atividade</th>
                <th className="text-left px-4 py-2.5">Vencimento</th>
                <th className="text-right px-4 py-2.5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Carregando…</td></tr>}
              {!loading && filtered.map(r => {
                const plan = PLAN_LABEL[r.plan];
                return (
                  <tr key={r.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="font-medium flex items-center gap-1.5">
                        {r.full_name || "—"}
                        {r.is_admin && <Shield className="h-3 w-3 text-gold" />}
                      </div>
                      <div className="text-xs text-muted-foreground">{r.city || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">{r.email}</div>
                      <div className="text-xs text-muted-foreground">{r.phone || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status]}`} />
                        {r.status}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={plan.cls}>{plan.label}</Badge>
                      {r.amount_cents > 0 && <div className="text-[10px] text-muted-foreground mt-0.5">R$ {(r.amount_cents / 100).toFixed(2)}/mês</div>}
                    </td>
                    <td className="px-4 py-3 text-xs">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-xs">{new Date(r.updated_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.current_period_end ? new Date(r.current_period_end).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <select
                          value={r.plan}
                          onChange={(e) => changePlan(r.user_id, e.target.value as any)}
                          className="text-xs border border-border bg-background rounded-md px-2 py-1"
                        >
                          <option value="free">Gratuito</option>
                          <option value="pro">Pro</option>
                          <option value="comercial_ia">Comercial IA</option>
                        </select>
                        <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                          <Link to="/admin/corretores/$userId" params={{ userId: r.user_id }}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum corretor encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
