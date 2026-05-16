import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Link2, Search, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { getWebhookSettings, saveWebhookSettings, testWebhookSettings } from "@/server-fns/webhook-settings";

export const Route = createFileRoute("/_app/integracoes")({
  head: () => ({ meta: [{ title: "Integrações — Leadlink" }] }),
  loader: () => getWebhookSettings(),
  component: IntegracoesPage,
});

type IntegrationCategory = "Comunicação" | "Agenda" | "Automação";

type Integration = {
  id: string;
  name: string;
  category: IntegrationCategory;
  status: string;
  description: string;
  type: string;
  buttonLabel: string;
  icon: typeof Sparkles;
};

const INTEGRATIONS: Integration[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    category: "Comunicação",
    status: "Ativo",
    description: "Após o lead responder o formulário, o LeadLink abre o WhatsApp com uma mensagem preenchida automaticamente.",
    type: "Link inteligente",
    buttonLabel: "Configurar",
    icon: Link2,
  },
  {
    id: "email",
    name: "E-mail",
    category: "Comunicação",
    status: "Disponível",
    description: "Envie notificações de novos leads por e-mail usando SMTP ou Resend.",
    type: "SMTP/Resend",
    buttonLabel: "Configurar",
    icon: Zap,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    category: "Agenda",
    status: "Em breve",
    description: "Sincronize visitas e compromissos com o Google Calendar.",
    type: "OAuth",
    buttonLabel: "Em breve",
    icon: Sparkles,
  },
  {
    id: "webhook",
    name: "Webhook",
    category: "Automação",
    status: "Disponível",
    description: "Envie eventos do LeadLink para qualquer sistema externo via webhook.",
    type: "Webhook",
    buttonLabel: "Configurar",
    icon: Link2,
  },
  {
    id: "zapier",
    name: "Zapier",
    category: "Automação",
    status: "Compatível via Webhook",
    description: "Use o Webhook do LeadLink para conectar com Zapier.",
    type: "Webhook",
    buttonLabel: "Ver instruções",
    icon: Link2,
  },
  {
    id: "make",
    name: "Make",
    category: "Automação",
    status: "Compatível via Webhook",
    description: "Use o Webhook do LeadLink para criar cenários no Make.",
    type: "Webhook",
    buttonLabel: "Ver instruções",
    icon: Link2,
  },
  {
    id: "n8n",
    name: "n8n",
    category: "Automação",
    status: "Compatível via Webhook",
    description: "Use o Webhook do LeadLink para automações self-hosted no n8n.",
    type: "Webhook",
    buttonLabel: "Ver instruções",
    icon: Link2,
  },
];

const CATEGORIES: ("Todas" | IntegrationCategory)[] = ["Todas", "Comunicação", "Agenda", "Automação"];

function IntegracoesPage() {
  const settings = Route.useLoaderData() as Awaited<ReturnType<typeof getWebhookSettings>>;
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Todas");
  const [query, setQuery] = useState("");
  const [webhookUrl, setWebhookUrl] = useState(settings.config?.url ?? "");
  const [webhookEnabled, setWebhookEnabled] = useState(settings.enabled);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const filtered = useMemo(() => {
    return INTEGRATIONS.filter((item) => {
      if (cat !== "Todas" && item.category !== cat) return false;
      if (query && !item.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [cat, query]);

  const handleSaveWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Informe a URL do webhook");
      return;
    }
    setSaving(true);
    try {
      await (saveWebhookSettings as any)({
        data: {
          enabled: webhookEnabled,
          config: { url: webhookUrl.trim(), events: ["lead.created"] },
        },
      });
      toast.success("Webhook salvo");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar webhook");
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Informe a URL do webhook");
      return;
    }
    setTesting(true);
    try {
      await (testWebhookSettings as any)({ data: { url: webhookUrl.trim() } });
      toast.success("Teste enviado com sucesso");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao testar webhook");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <Card className="p-6 md:p-8 border-border/70">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Integrações</div>
            <h2 className="font-display text-3xl font-semibold tracking-tight mt-1">
              Integrações reais e prontas para uso
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Mantemos apenas o que é funcional agora: comunicação, agenda e automações via Webhook.
              O restante segue como roadmap honesto.
            </p>
          </div>
          <div className="flex gap-6 shrink-0">
            <Stat value={INTEGRATIONS.length} label="Disponíveis" tone="emerald" />
            <div className="w-px bg-border" />
            <Stat value={3} label="Categorias" />
            <div className="w-px bg-border" />
            <Stat value={5} label="Roadmap futuro" />
          </div>
        </div>
      </Card>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar integração..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Badge
            key={c}
            onClick={() => setCat(c)}
            variant={cat === c ? "default" : "outline"}
            className={`rounded-full px-3 py-1.5 cursor-pointer font-normal ${
              cat === c ? "bg-navy text-navy-foreground hover:bg-navy/90" : "border-border hover:bg-secondary"
            }`}
          >
            {c}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const Icon = item.icon;
          const isWebhook = item.id === "webhook";
          return (
            <Card key={item.id} className="p-5 border-border/70 hover:shadow-soft transition-all flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center font-display text-xl font-semibold text-foreground shrink-0">
                  {item.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold leading-tight">{item.name}</h3>
                    <span
                      className={`inline-flex items-center gap-0.5 text-[10px] font-medium rounded-full px-1.5 py-0.5 ${
                        item.status === "Ativo" ? "text-emerald bg-emerald/10" : item.status === "Disponível" ? "text-emerald bg-emerald/10" : "text-amber-700 bg-amber-100"
                      }`}
                    >
                      <Check className="h-2.5 w-2.5" /> {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-normal rounded-full border-border">
                      {item.category}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-[10px] rounded-full px-1.5 py-0.5 border text-navy border-navy/30 bg-navy/10">
                      <Icon className="h-2.5 w-2.5" /> {item.type}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{item.description}</p>

              <div className="mt-4 pt-4 border-t border-border space-y-3">
                {isWebhook ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">Webhook ativo</span>
                      <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
                    </div>
                    <div className="space-y-2">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">URL do webhook</div>
                      <Input
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://..."
                        className="h-9"
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Evento disponível: <span className="font-medium text-foreground">lead.created</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveWebhook}
                        disabled={saving}
                        className="h-8 text-xs bg-navy text-navy-foreground hover:bg-navy/90 rounded-full"
                      >
                        {saving ? "Salvando..." : "Configurar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTestWebhook}
                        disabled={testing}
                        className="h-8 text-xs rounded-full"
                      >
                        {testing ? "Testando..." : "Testar webhook"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-[11px] text-muted-foreground">
                      {item.status === "Ativo"
                        ? "Após o lead responder o formulário, o WhatsApp abre com mensagem automática."
                        : "Configuração disponível no Meu Link."}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Button
                        size="sm"
                        onClick={() => {
                          toast.info("Configure seu número de WhatsApp em Meu Link.");
                        }}
                        className="h-8 text-xs bg-navy text-navy-foreground hover:bg-navy/90 rounded-full"
                      >
                        {item.buttonLabel}
                      </Button>
                      <Link to="/meu-link" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">
                        Configure seu número de WhatsApp em Meu Link.
                      </Link>
                    </div>
                  </div>
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

      <Card className="p-6 md:p-7 border-border/70 bg-secondary/20">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Planejadas para versões futuras</div>
        <h3 className="font-display text-xl font-semibold mb-2">Roadmap honesto</h3>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Essas integrações estão previstas para versões futuras e dependem de APIs, aprovações ou contratos externos.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Portais imobiliários", "Meta Lead Ads", "CRMs externos", "Pagamentos", "Calendários externos"].map((item) => (
            <Badge key={item} variant="outline" className="rounded-full px-3 py-1.5">
              {item}
            </Badge>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Planejadas para versões futuras</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RoadmapCard
            title="Portais imobiliários"
            items={["ZAP Imóveis", "Viva Real", "OLX", "Imovelweb"]}
            description="Dependem de disponibilidade de API, contratos ou webhooks dos portais."
          />
          <RoadmapCard
            title="Marketing"
            items={["Meta Lead Ads", "Google Ads", "TikTok Leads"]}
            description="Planejado para importar leads de campanhas pagas."
          />
          <RoadmapCard
            title="CRMs externos"
            items={["RD Station", "Pipedrive", "HubSpot"]}
            description="Planejado para sincronização de contatos e oportunidades."
          />
          <RoadmapCard
            title="Pagamentos"
            items={["Asaas", "Mercado Pago", "Stripe"]}
            description="Planejado para cobrança de mensalidades, sinais e serviços."
          />
        </div>
      </div>
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

function RoadmapCard({
  title,
  items,
  description,
}: {
  title: string;
  items: string[];
  description: string;
}) {
  return (
    <Card className="p-5 border-border/70 bg-background/70">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{title}</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {items.map((item) => (
          <Badge key={item} variant="outline" className="rounded-full px-3 py-1.5 text-xs">
            {item}
          </Badge>
        ))}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  );
}
