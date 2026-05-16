import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Zap,
  MessageCircle,
  Mail,
  Clock,
  UserPlus,
  RefreshCw,
  Calendar,
  Plus,
  ArrowDown,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_app/automacoes")({
  head: () => ({ meta: [{ title: "Automações — Imovix" }] }),
  component: Automations,
});

const templates = [
  { name: "Primeiro Contato", desc: "Mensagem instantânea ao receber lead", icon: Sparkles, color: "bg-gold/15 text-gold" },
  { name: "Reengajamento", desc: "Lead sem resposta em 24h", icon: RefreshCw, color: "bg-warning/15 text-warning" },
  { name: "Confirmação de Visita", desc: "Lembrete 1 dia antes", icon: Calendar, color: "bg-chart-2/15 text-chart-2" },
  { name: "Pós-Visita", desc: "Follow-up automático", icon: MessageCircle, color: "bg-success/15 text-success" },
];

const flow = [
  { type: "trigger", icon: Zap, title: "Lead recebido", desc: "Quando um novo lead chega via qualquer fonte", tone: "gold" },
  { type: "action", icon: MessageCircle, title: "Enviar WhatsApp", desc: "Template: Primeiro contato", tone: "navy" },
  { type: "wait", icon: Clock, title: "Aguardar 2 horas", desc: "Tempo para resposta inicial", tone: "muted" },
  { type: "action", icon: Mail, title: "Enviar e-mail", desc: "Apresentação + portfólio em PDF", tone: "navy" },
  { type: "wait", icon: Clock, title: "Aguardar 24 horas", desc: "Janela de qualificação", tone: "muted" },
  { type: "action", icon: UserPlus, title: "Atribuir corretor", desc: "Round-robin entre time disponível", tone: "navy" },
];

const STORAGE_KEY = "leadlink:automation-draft";

function Automations() {
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].name);
  const [enabled, setEnabled] = useState(true);
  const [steps, setSteps] = useState(flow);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { selectedTemplate?: string; enabled?: boolean; steps?: typeof flow };
      if (parsed.selectedTemplate) setSelectedTemplate(parsed.selectedTemplate);
      if (typeof parsed.enabled === "boolean") setEnabled(parsed.enabled);
      if (Array.isArray(parsed.steps) && parsed.steps.length) setSteps(parsed.steps);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedTemplate, enabled, steps }));
    } catch {
      /* noop */
    }
  }, [selectedTemplate, enabled, steps]);

  const addStep = () => {
    setSteps((curr) => [
      ...curr,
      { type: "action", icon: MessageCircle, title: "Nova ação", desc: "Configure a etapa", tone: "navy" },
    ]);
    toast.success("Etapa adicionada");
  };

  const resetFlow = () => {
    setSelectedTemplate(templates[0].name);
    setEnabled(true);
    setSteps(flow);
    toast.success("Fluxo restaurado");
  };

  return (
    <div className="space-y-6 max-w-[1300px] mx-auto">
      {/* Templates */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold">Modelos prontos</h2>
            <p className="text-xs text-muted-foreground">Comece com fluxos pré-configurados</p>
          </div>
          <Button className="bg-gold text-navy hover:bg-gold/90 font-semibold">
            <Plus className="h-4 w-4 mr-1" /> Novo Fluxo
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {templates.map((t) => (
            <Card
              key={t.name}
              className={`p-4 hover:shadow-lift hover:-translate-y-px transition-all cursor-pointer group ${
                selectedTemplate === t.name ? "ring-2 ring-gold" : ""
              }`}
              onClick={() => {
                setSelectedTemplate(t.name);
                toast.success(`Template selecionado: ${t.name}`);
              }}
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${t.color}`}>
                <t.icon className="h-5 w-5" />
              </div>
              <div className="font-semibold text-sm">{t.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
              <div className="mt-3 text-xs text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                Usar template →
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Flow editor */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Fluxo: {selectedTemplate}</h2>
              <Badge className={enabled ? "bg-success/15 text-success border border-success/30" : "bg-muted text-muted-foreground border border-border"}>
                {enabled ? "Ativo" : "Pausado"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Editado há 3 horas · 142 execuções nos últimos 7 dias</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.success("Pré-visualização aberta")}>Pré-visualizar</Button>
            <Button variant="outline" size="sm" onClick={() => setEnabled((v) => !v)}>
              {enabled ? "Pausar" : "Ativar"}
            </Button>
            <Button size="sm" className="bg-navy text-navy-foreground hover:bg-navy/90" onClick={() => toast.success("Fluxo salvo")}>Salvar</Button>
            <Button variant="ghost" size="sm" onClick={resetFlow}>Restaurar</Button>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 max-w-md mx-auto">
          {steps.map((node, i) => (
            <div key={i} className="w-full flex flex-col items-center">
              <Card
                className={`w-full p-4 border-2 transition-all hover:shadow-lift cursor-pointer ${
                  node.tone === "gold" ? "border-gold/40 bg-gold/5" :
                  node.tone === "navy" ? "border-navy/20" :
                  "border-dashed border-border bg-secondary/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    node.tone === "gold" ? "bg-gold text-navy" :
                    node.tone === "navy" ? "bg-navy text-navy-foreground" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    <node.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      {node.type === "trigger" ? "Gatilho" : node.type === "wait" ? "Espera" : "Ação"}
                    </div>
                    <div className="font-semibold text-sm">{node.title}</div>
                    <div className="text-xs text-muted-foreground">{node.desc}</div>
                  </div>
                </div>
              </Card>
              {i < flow.length - 1 && (
                <div className="py-1 text-muted-foreground"><ArrowDown className="h-4 w-4" /></div>
              )}
            </div>
          ))}
          <button type="button" onClick={addStep} className="mt-2 inline-flex items-center gap-1.5 text-xs text-gold hover:underline">
            <Plus className="h-3.5 w-3.5" /> Adicionar etapa
          </button>
        </div>
      </Card>
    </div>
  );
}
