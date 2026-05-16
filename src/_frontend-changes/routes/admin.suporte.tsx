import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LifeBuoy, Bug, Lightbulb, Search, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/admin/suporte")({
  component: AdminSupport,
});

interface Ticket {
  id: string; subject: string; broker: string; email: string;
  type: "support" | "bug" | "feature";
  priority: "low" | "medium" | "high"; status: "open" | "in_progress" | "resolved";
  createdAt: string; lastReply: string;
}

const MOCK: Ticket[] = [
  { id: "T-1042", subject: "Como integrar com VivaReal?", broker: "Mariana Silva", email: "mariana@imob.com", type: "support", priority: "medium", status: "open", createdAt: "2026-05-12", lastReply: "—" },
  { id: "T-1041", subject: "Erro ao salvar imóvel com mais de 10 fotos", broker: "Carlos Mendes", email: "carlos@cm.com", type: "bug", priority: "high", status: "in_progress", createdAt: "2026-05-11", lastReply: "2026-05-12" },
  { id: "T-1040", subject: "Sugestão: filtro por bairro na vitrine", broker: "Juliana Costa", email: "ju@costaimoveis.com", type: "feature", priority: "low", status: "open", createdAt: "2026-05-10", lastReply: "—" },
  { id: "T-1039", subject: "Cobrança duplicada em maio", broker: "Pedro Almeida", email: "pedro@pa.com", type: "support", priority: "high", status: "resolved", createdAt: "2026-05-08", lastReply: "2026-05-09" },
];

const TABS = [
  { id: "all", label: "Todos" },
  { id: "support", label: "Suporte" },
  { id: "bug", label: "Bugs" },
  { id: "feature", label: "Sugestões" },
];

function AdminSupport() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const filtered = MOCK.filter(t =>
    (tab === "all" || t.type === tab) &&
    (!q || [t.subject, t.broker, t.email, t.id].some(s => s.toLowerCase().includes(q.toLowerCase())))
  );

  return (
    <div className="space-y-5 max-w-[1300px]">
      <div>
        <h1 className="font-display text-2xl font-semibold">Suporte e tickets</h1>
        <p className="text-sm text-muted-foreground">Solicitações, bugs reportados e pedidos de melhoria dos corretores.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={LifeBuoy} label="Tickets abertos" value={MOCK.filter(t => t.status === "open").length} />
        <Stat icon={MessageSquare} label="Em atendimento" value={MOCK.filter(t => t.status === "in_progress").length} accent="text-navy" />
        <Stat icon={Bug} label="Bugs ativos" value={MOCK.filter(t => t.type === "bug" && t.status !== "resolved").length} accent="text-destructive" />
        <Stat icon={Lightbulb} label="Sugestões" value={MOCK.filter(t => t.type === "feature").length} accent="text-gold" />
      </div>

      <Card>
        <div className="border-b border-border flex items-center justify-between px-2">
          <div className="flex">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-3 text-sm border-b-2 transition-colors ${tab === t.id ? "border-navy text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-60 mr-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ticket…" className="pl-9 h-9" />
          </div>
        </div>
        <div className="p-2">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Assunto</th>
                <th className="text-left px-3 py-2">Corretor</th>
                <th className="text-left px-3 py-2">Prioridade</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Última resposta</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-secondary/30">
                  <td className="px-3 py-2.5 font-mono text-xs">{t.id}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{t.subject}</div>
                    <Badge variant="outline" className="text-[9px] mt-1">{t.type}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-xs">{t.broker}</div>
                    <div className="text-[10px] text-muted-foreground">{t.email}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge className={t.priority === "high" ? "bg-destructive/15 text-destructive border-0" : t.priority === "medium" ? "bg-gold/15 text-gold border-0" : "bg-secondary"}>
                      {t.priority}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge className={t.status === "resolved" ? "bg-emerald/15 text-emerald border-0" : t.status === "in_progress" ? "bg-navy/15 text-navy border-0" : "bg-secondary"}>
                      {t.status === "open" ? "aberto" : t.status === "in_progress" ? "em atendimento" : "resolvido"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{t.lastReply}</td>
                  <td className="px-3 py-2.5 text-right"><Button size="sm" variant="ghost">Abrir</Button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum ticket.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold ${accent || ""}`}>{value}</div>
    </Card>
  );
}
