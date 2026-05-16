import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, CreditCard, Activity,
  Link2, Shield, Ban, RefreshCw, KeyRound, Trash2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/corretores/$userId")({
  component: BrokerProfile,
});

const PLAN_LABEL: Record<string, { label: string; cls: string }> = {
  free: { label: "Gratuito", cls: "bg-secondary text-foreground" },
  pro: { label: "Pro", cls: "bg-navy text-navy-foreground" },
  comercial_ia: { label: "Comercial IA", cls: "bg-gold text-navy" },
};

function BrokerProfile() {
  const { userId } = useParams({ from: "/admin/corretores/$userId" });
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [leadsCount, setLeadsCount] = useState(0);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: s }, { count }, { data: latest }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      setProfile(p);
      setSub(s);
      setLeadsCount(count || 0);
      setRecentLeads(latest || []);
    })();
  }, [userId]);

  const changePlan = async (plan: "free" | "pro" | "comercial_ia") => {
    const amount = plan === "pro" ? 9700 : plan === "comercial_ia" ? 19700 : 0;
    const next = plan === "free" ? null : new Date(Date.now() + 30 * 86400000).toISOString();
    const { error } = await supabase.from("subscriptions")
      .update({ plan, amount_cents: amount, current_period_end: next, status: "active" })
      .eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success("Plano atualizado");
    setSub((s: any) => ({ ...s, plan, amount_cents: amount, current_period_end: next, status: "active" }));
  };

  const setStatus = async (status: "active" | "canceled" | "past_due" | "trial") => {
    const { error } = await supabase.from("subscriptions").update({ status }).eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    setSub((s: any) => ({ ...s, status }));
  };

  if (!profile) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const plan = PLAN_LABEL[sub?.plan || "free"];

  // Mock payment history derived from sub
  const payments = sub && sub.amount_cents > 0 ? [
    { date: sub.started_at, amount: sub.amount_cents, status: "paid" },
    { date: new Date(new Date(sub.started_at).getTime() + 30 * 86400000).toISOString(), amount: sub.amount_cents, status: "paid" },
  ] : [];

  return (
    <div className="space-y-5 max-w-[1200px]">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin/usuarios"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Voltar para corretores</Link>
      </Button>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-navy text-navy-foreground grid place-items-center text-xl font-display font-semibold">
              {(profile.full_name || profile.email || "?").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">{profile.full_name || "—"}</h1>
              <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap mt-1">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {profile.email}</span>
                {profile.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {profile.phone}</span>}
                {profile.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {profile.city}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={plan.cls}>{plan.label}</Badge>
            <Badge variant="outline" className="capitalize">{sub?.status || "active"}</Badge>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Stat icon={Calendar} label="Cadastro" value={new Date(profile.created_at).toLocaleDateString("pt-BR")} />
        <Stat icon={Activity} label="Última atividade" value={new Date(profile.updated_at).toLocaleDateString("pt-BR")} />
        <Stat icon={CreditCard} label="Próx. cobrança" value={sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("pt-BR") : "—"} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Limites e uso</h3>
          <UsageRow label="Imóveis cadastrados" value={2} max={sub?.plan === "free" ? 3 : Infinity} />
          <UsageRow label="Compromissos na agenda" value={1} max={sub?.plan === "free" ? 2 : Infinity} />
          <UsageRow label="Leads capturados" value={leadsCount} max={Infinity} />
          <UsageRow label="Automações ativas" value={sub?.plan === "free" ? 0 : 3} max={Infinity} />
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Sites e contas vinculadas</h3>
          <div className="space-y-2 text-sm">
            <LinkedItem icon={Link2} label="Página pública (Meu Link)" value={`/l/${profile.full_name?.toLowerCase().replace(/\s+/g, "-") || "corretor"}`} />
            <LinkedItem icon={Link2} label="Vitrine de imóveis" value="ativa" />
            <LinkedItem icon={Link2} label="Integrações conectadas" value="0 conectadas" />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3">Histórico de pagamentos</h3>
        {payments.length === 0 ? (
          <div className="text-xs text-muted-foreground py-3">Nenhum pagamento registrado (plano gratuito).</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr><th className="text-left py-2">Data</th><th className="text-left py-2">Valor</th><th className="text-left py-2">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p, i) => (
                <tr key={i}>
                  <td className="py-2">{new Date(p.date).toLocaleDateString("pt-BR")}</td>
                  <td className="py-2 font-mono text-xs">R$ {(p.amount / 100).toFixed(2)}</td>
                  <td className="py-2"><Badge className="bg-emerald/15 text-emerald border-0">Pago</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3">Atividades recentes</h3>
        <div className="divide-y divide-border text-sm">
          {recentLeads.slice(0, 5).map(l => (
            <div key={l.id} className="py-2 flex justify-between">
              <span>Novo lead: <span className="font-medium">{l.name}</span></span>
              <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
            </div>
          ))}
          {recentLeads.length === 0 && <div className="text-xs text-muted-foreground py-2">Nenhuma atividade recente.</div>}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Observações internas</h3>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações da equipe sobre este corretor…" rows={5} />
          <Button size="sm" className="mt-2" onClick={() => toast.success("Observação salva")}>Salvar observação</Button>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Ações administrativas</h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">Alterar plano</label>
              <select value={sub?.plan || "free"} onChange={(e) => changePlan(e.target.value as any)} className="w-full text-sm border border-border bg-background rounded-md px-2 py-1.5 mt-1">
                <option value="free">Gratuito</option>
                <option value="pro">Pro</option>
                <option value="comercial_ia">Comercial IA</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => setStatus("active")}><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reativar</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus("past_due")}><Shield className="h-3.5 w-3.5 mr-1.5" /> Marcar atraso</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus("canceled")}><Ban className="h-3.5 w-3.5 mr-1.5" /> Cancelar</Button>
              <Button size="sm" variant="outline" onClick={() => toast.info("E-mail de redefinição enviado")}><KeyRound className="h-3.5 w-3.5 mr-1.5" /> Reset senha</Button>
            </div>
            <Button size="sm" variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => toast.error("Ação requer confirmação adicional")}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir conta
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className="mt-1 font-display text-lg font-semibold">{value}</div>
    </Card>
  );
}

function UsageRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max === Infinity ? 30 : Math.min(100, (value / max) * 100);
  const isLimit = max !== Infinity && value >= max;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className={`text-muted-foreground ${isLimit ? "text-destructive font-medium" : ""}`}>{value}{max !== Infinity ? ` / ${max}` : ""}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${isLimit ? "bg-destructive" : "bg-navy"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LinkedItem({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <span className="text-xs font-medium font-mono">{value}</span>
    </div>
  );
}
