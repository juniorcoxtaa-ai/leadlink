import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Check, KeyRound, Link2, Lock, Plus, Search, Settings2, Sparkles, Zap } from "lucide-react";
import { integrations as seed, type Integration, type IntegrationCategory } from "@/lib/mock-data";
import { IntegrationConnectDialog } from "@/components/IntegrationConnectDialog";

export const Route = createFileRoute("/_app/integracoes")({
  head: () => ({ meta: [{ title: "Integrações — Leadlink" }] }),
  component: IntegracoesPage,
});

const CATEGORIES: ("Todas" | IntegrationCategory)[] = [
  "Todas", "Portal", "Comunicação", "Marketing", "Agenda", "CRM", "Pagamento", "Automação",
];

const AUTH_BADGE: Record<string, { label: string; icon: any; cls: string }> = {
  oauth:       { label: "OAuth",   icon: Sparkles,  cls: "text-emerald border-emerald/30 bg-emerald/10" },
  api_key:     { label: "API Key", icon: KeyRound,  cls: "text-gold border-gold/30 bg-gold/10" },
  webhook:     { label: "Webhook", icon: Link2,     cls: "text-navy border-navy/30 bg-navy/10" },
  credentials: { label: "Login",   icon: Lock,      cls: "text-foreground border-border bg-secondary" },
  embed:       { label: "Extensão",icon: Zap,       cls: "text-emerald border-emerald/30 bg-emerald/10" },
};

function IntegracoesPage() {
  const [items, setItems] = useState<Integration[]>(seed);
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Todas");
  const [query, setQuery] = useState("");
  const [onlyConnected, setOnlyConnected] = useState(false);
  const [active, setActive] = useState<Integration | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (cat !== "Todas" && i.category !== cat) return false;
      if (onlyConnected && !i.connected) return false;
      if (query && !i.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [items, cat, query, onlyConnected]);

  const connected = items.filter((i) => i.connected);
  const totalLeads = connected.reduce((s, i) => s + (i.leads || 0), 0);

  const openIntegration = (it: Integration) => { setActive(it); setOpen(true); };
  const onConnected = (id: string) => setItems((arr) => arr.map((i) => i.id === id ? { ...i, connected: true } : i));
  const toggle = (id: string, value: boolean) =>
    setItems((arr) => arr.map((i) => i.id === id ? { ...i, connected: value } : i));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Hero */}
      <Card className="p-6 md:p-8 border-border/70">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Integrações</div>
            <h2 className="font-display text-3xl font-semibold tracking-tight mt-1">Conecte tudo que você usa</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Centralize leads de portais, redes sociais, agenda, pagamentos e automações em um só lugar.
              Sem CSVs, sem retrabalho.
            </p>
          </div>
          <div className="flex gap-6 shrink-0">
            <Stat value={connected.length} label="Conectadas" tone="emerald" />
            <div className="w-px bg-border" />
            <Stat value={totalLeads} label="Leads no mês" />
            <div className="w-px bg-border" />
            <Stat value={items.length} label="Disponíveis" />
          </div>
        </div>
      </Card>

      {/* Search + filters */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar integração…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={onlyConnected} onCheckedChange={setOnlyConnected} />
            Só conectadas
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Badge
            key={c}
            onClick={() => setCat(c)}
            variant={cat === c ? "default" : "outline"}
            className={`rounded-full px-3 py-1.5 cursor-pointer font-normal ${cat === c ? "bg-navy text-navy-foreground hover:bg-navy/90" : "border-border hover:bg-secondary"}`}
          >
            {c}
          </Badge>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((it) => {
          const auth = AUTH_BADGE[it.authType];
          const AuthIcon = auth.icon;
          return (
            <Card key={it.id} className="p-5 border-border/70 hover:shadow-soft transition-all flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center font-display text-xl font-semibold text-foreground shrink-0">
                  {it.letter}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold leading-tight">{it.name}</h3>
                    {it.connected && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald bg-emerald/10 rounded-full px-1.5 py-0.5">
                        <Check className="h-2.5 w-2.5" /> Ativo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-normal rounded-full border-border">
                      {it.category}
                    </Badge>
                    <span className={`inline-flex items-center gap-1 text-[10px] rounded-full px-1.5 py-0.5 border ${auth.cls}`}>
                      <AuthIcon className="h-2.5 w-2.5" /> {auth.label}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{it.description}</p>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                {it.connected ? (
                  <>
                    <div className="text-[11px] text-muted-foreground">
                      {typeof it.leads === "number" ? (
                        <><span className="font-mono font-semibold text-foreground">{it.leads}</span> leads / mês</>
                      ) : (
                        "Sincronizando"
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm" variant="ghost" className="h-8 text-xs"
                        onClick={() => openIntegration(it)}
                      >
                        <Settings2 className="h-3 w-3 mr-1" /> Configurar
                      </Button>
                      <Switch
                        checked={it.connected}
                        onCheckedChange={(v) => toggle(it.id, v)}
                        aria-label="Ativar/desativar"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[11px] text-muted-foreground">Não conectado</div>
                    <Button
                      size="sm"
                      onClick={() => openIntegration(it)}
                      className="h-8 text-xs bg-navy text-navy-foreground hover:bg-navy/90 rounded-full"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Conectar
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhuma integração encontrada com esses filtros.
        </Card>
      )}

      <IntegrationConnectDialog
        integration={active}
        open={open}
        onOpenChange={setOpen}
        onConnected={onConnected}
      />
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: "emerald" }) {
  return (
    <div>
      <div className={`font-display text-3xl font-semibold ${tone === "emerald" ? "text-emerald" : ""}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
    </div>
  );
}
