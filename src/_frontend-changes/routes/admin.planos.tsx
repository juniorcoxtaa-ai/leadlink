import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Layers, Edit, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/planos")({
  component: AdminPlans,
});

interface Plan {
  id: string;
  label: string;
  price: number;
  active: boolean;
  limits: { imoveis: number | null; agenda: number | null; automacoes: number | null; ia: boolean };
}

const INITIAL: Plan[] = [
  { id: "free", label: "Gratuito", price: 0, active: true, limits: { imoveis: 3, agenda: 2, automacoes: 0, ia: false } },
  { id: "pro", label: "Pro", price: 97, active: true, limits: { imoveis: null, agenda: null, automacoes: null, ia: false } },
  { id: "comercial_ia", label: "Comercial IA", price: 197, active: true, limits: { imoveis: null, agenda: null, automacoes: null, ia: true } },
];

function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>(INITIAL);
  const [editing, setEditing] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("subscriptions").select("plan");
      const c: Record<string, number> = {};
      (data || []).forEach((s: any) => { c[s.plan] = (c[s.plan] || 0) + 1; });
      setCounts(c);
    })();
  }, []);

  const update = (id: string, patch: Partial<Plan>) => {
    setPlans(plans.map(p => p.id === id ? { ...p, ...patch } : p));
  };
  const updateLimit = (id: string, key: keyof Plan["limits"], value: any) => {
    setPlans(plans.map(p => p.id === id ? { ...p, limits: { ...p.limits, [key]: value } } : p));
  };

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Planos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os planos disponíveis na plataforma e seus limites.</p>
        </div>
        <Button variant="outline" size="sm"><Layers className="h-3.5 w-3.5 mr-1.5" /> Novo plano</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map(p => {
          const isEditing = editing === p.id;
          return (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge variant="outline" className="text-[10px]">{p.id}</Badge>
                  {isEditing ? (
                    <Input value={p.label} onChange={(e) => update(p.id, { label: e.target.value })} className="mt-2 h-8 font-semibold" />
                  ) : (
                    <h3 className="font-display text-lg font-semibold mt-1">{p.label}</h3>
                  )}
                </div>
                <Switch checked={p.active} onCheckedChange={(v) => update(p.id, { active: v })} />
              </div>

              <div className="mb-4">
                <div className="text-xs text-muted-foreground">Preço mensal</div>
                {isEditing ? (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm">R$</span>
                    <Input type="number" value={p.price} onChange={(e) => update(p.id, { price: Number(e.target.value) })} className="h-8" />
                  </div>
                ) : (
                  <div className="font-display text-2xl font-bold">R$ {p.price.toFixed(2).replace(".", ",")}</div>
                )}
              </div>

              <div className="space-y-2 text-sm border-t border-border pt-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Limites</div>
                <LimitRow label="Imóveis" value={p.limits.imoveis} editing={isEditing} onChange={(v) => updateLimit(p.id, "imoveis", v)} />
                <LimitRow label="Agenda" value={p.limits.agenda} editing={isEditing} onChange={(v) => updateLimit(p.id, "agenda", v)} />
                <LimitRow label="Automações" value={p.limits.automacoes} editing={isEditing} onChange={(v) => updateLimit(p.id, "automacoes", v)} />
                <div className="flex justify-between items-center text-xs">
                  <span>IA integrada</span>
                  {isEditing ? (
                    <Switch checked={p.limits.ia} onCheckedChange={(v) => updateLimit(p.id, "ia", v)} />
                  ) : (
                    <Badge className={p.limits.ia ? "bg-gold text-navy" : "bg-secondary"}>{p.limits.ia ? "Sim" : "Não"}</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground">{counts[p.id] || 0} assinantes</div>
                <Button size="sm" variant={isEditing ? "default" : "outline"} onClick={() => { if (isEditing) toast.success("Plano atualizado (visual)"); setEditing(isEditing ? null : p.id); }}>
                  {isEditing ? <><Save className="h-3.5 w-3.5 mr-1.5" /> Salvar</> : <><Edit className="h-3.5 w-3.5 mr-1.5" /> Editar</>}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5 text-xs text-muted-foreground">
        <strong className="text-foreground">Regras de trial:</strong> novos usuários ganham 30 dias de avaliação no plano selecionado no cadastro. Após o vencimento, retornam ao Gratuito automaticamente.
      </Card>
    </div>
  );
}

function LimitRow({ label, value, editing, onChange }: { label: string; value: number | null; editing: boolean; onChange: (v: number | null) => void }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span>{label}</span>
      {editing ? (
        <div className="flex items-center gap-1">
          <Input type="number" value={value ?? ""} placeholder="∞" onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} className="h-7 w-20" />
        </div>
      ) : (
        <span className="font-medium">{value === null ? "ilimitado" : value}</span>
      )}
    </div>
  );
}
