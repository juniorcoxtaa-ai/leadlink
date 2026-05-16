import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, FileText, Sparkles, Zap, Home, Plug, FolderKanban } from "lucide-react";

export const Route = createFileRoute("/admin/conteudo")({
  component: AdminContent,
});

const SECTIONS = [
  { id: "links", label: "Páginas públicas", icon: Globe },
  { id: "quizzes", label: "Quizzes", icon: FileText },
  { id: "templates", label: "Templates", icon: FolderKanban },
  { id: "automations", label: "Automações", icon: Zap },
  { id: "imoveis", label: "Imóveis", icon: Home },
  { id: "integracoes", label: "Integrações", icon: Plug },
];

function AdminContent() {
  const [section, setSection] = useState("links");

  return (
    <div className="space-y-5 max-w-[1300px]">
      <div>
        <h1 className="font-display text-2xl font-semibold">Conteúdo e recursos</h1>
        <p className="text-sm text-muted-foreground">Tudo que os corretores criam e usam na plataforma.</p>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} className={`p-3 rounded-lg border text-left transition-colors ${section === s.id ? "border-navy bg-navy/5" : "border-border hover:border-navy/40"}`}>
            <s.icon className={`h-4 w-4 mb-1.5 ${section === s.id ? "text-navy" : "text-muted-foreground"}`} />
            <div className="text-xs font-medium">{s.label}</div>
          </button>
        ))}
      </div>

      <Card className="p-5">
        {section === "links" && <ContentTable title="Páginas públicas (Meu Link)" total={1} />}
        {section === "quizzes" && <ContentTable title="Quizzes do funil" total={0} />}
        {section === "templates" && <ContentTable title="Templates disponíveis" total={5} />}
        {section === "automations" && <ContentTable title="Automações cadastradas" total={12} />}
        {section === "imoveis" && <ContentTable title="Imóveis na plataforma" total={0} />}
        {section === "integracoes" && <ContentTable title="Integrações ativadas" total={3} />}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-gold" /> Modelos padrão da plataforma</h3>
          <Button size="sm" variant="outline">Adicionar modelo</Button>
        </div>
        <div className="space-y-2">
          {["Quiz padrão de qualificação", "Template de página pública", "Automação de boas-vindas", "Modelo de mensagem WhatsApp"].map(t => (
            <div key={t} className="flex items-center justify-between p-2.5 rounded-md border border-border">
              <span className="text-sm">{t}</span>
              <Badge variant="outline" className="text-[10px]">aplicado a todos</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ContentTable({ title, total }: { title: string; total: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{title}</h3>
        <Badge variant="outline">{total} itens</Badge>
      </div>
      {total === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Nenhum item ainda.</div>
      ) : (
        <div className="text-xs text-muted-foreground py-4">
          Visualização agregada. Em breve: filtros por corretor, status e ações em massa.
        </div>
      )}
    </div>
  );
}
