import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Palette, Globe, Layers, Mail, Plug, Bell, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/configuracoes")({
  component: AdminSettings,
});

const TABS = [
  { id: "branding", label: "Branding", icon: Palette },
  { id: "domain", label: "Domínio", icon: Globe },
  { id: "trial", label: "Trial e limites", icon: Layers },
  { id: "emails", label: "E-mails", icon: Mail },
  { id: "integrations", label: "Integrações globais", icon: Plug },
  { id: "notifications", label: "Notificações", icon: Bell },
];

function AdminSettings() {
  const [tab, setTab] = useState("branding");

  return (
    <div className="space-y-5 max-w-[1100px]">
      <div>
        <h1 className="font-display text-2xl font-semibold">Configurações da plataforma</h1>
        <p className="text-sm text-muted-foreground">Ajustes globais que se aplicam a todos os corretores.</p>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-5">
        <Card className="p-2 h-fit">
          <nav className="space-y-0.5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${tab === t.id ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"}`}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </nav>
        </Card>

        <Card className="p-6">
          {tab === "branding" && <Branding />}
          {tab === "domain" && <Domain />}
          {tab === "trial" && <Trial />}
          {tab === "emails" && <Emails />}
          {tab === "integrations" && <GlobalIntegrations />}
          {tab === "notifications" && <Notifications />}
        </Card>
      </div>
    </div>
  );
}

function Branding() {
  return (
    <SectionForm title="Branding" desc="Logo, cores e identidade visual da plataforma.">
      <Field label="Nome da plataforma" defaultValue="Leadlink" />
      <Field label="URL do logo" defaultValue="https://leadlink.com.br/logo.svg" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cor primária" defaultValue="#0F1B3A" type="color" />
        <Field label="Cor de destaque" defaultValue="#D4AF37" type="color" />
      </div>
    </SectionForm>
  );
}

function Domain() {
  return (
    <SectionForm title="Domínio" desc="Domínio principal usado em links públicos dos corretores.">
      <Field label="Domínio padrão" defaultValue="leadlink.com.br" />
      <Field label="Subdomínio para links" defaultValue="l.leadlink.com.br" />
      <SwitchRow label="Permitir domínio próprio (apenas plano Comercial IA)" defaultChecked />
    </SectionForm>
  );
}

function Trial() {
  return (
    <SectionForm title="Trial e limites globais" desc="Defina o período de teste e limites do plano Gratuito.">
      <Field label="Duração do trial (dias)" type="number" defaultValue="30" />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Imóveis (Free)" type="number" defaultValue="3" />
        <Field label="Agenda (Free)" type="number" defaultValue="2" />
        <Field label="Automações (Free)" type="number" defaultValue="0" />
      </div>
      <SwitchRow label="Avisar corretor 7 dias antes do fim do trial" defaultChecked />
    </SectionForm>
  );
}

function Emails() {
  return (
    <SectionForm title="E-mails da plataforma" desc="Remetente padrão e templates de e-mails transacionais.">
      <Field label="Nome do remetente" defaultValue="Leadlink" />
      <Field label="E-mail do remetente" defaultValue="contato@leadlink.com.br" />
      <Field label="Texto de boas-vindas" type="textarea" defaultValue="Olá! Seja bem-vindo ao Leadlink. Sua conta foi criada com sucesso." />
    </SectionForm>
  );
}

function GlobalIntegrations() {
  return (
    <SectionForm title="Integrações globais" desc="Chaves de API usadas por toda a plataforma.">
      <Field label="WhatsApp Business API token" type="password" defaultValue="" placeholder="••••••••••••" />
      <Field label="Google Maps API key" type="password" defaultValue="" placeholder="••••••••••••" />
      <Field label="Webhook de monitoramento" defaultValue="" placeholder="https://..." />
    </SectionForm>
  );
}

function Notifications() {
  return (
    <SectionForm title="Notificações administrativas" desc="Alertas enviados para a equipe interna.">
      <SwitchRow label="Notificar novo cadastro" defaultChecked />
      <SwitchRow label="Notificar nova assinatura paga" defaultChecked />
      <SwitchRow label="Notificar cancelamento" defaultChecked />
      <SwitchRow label="Notificar pagamento em atraso" defaultChecked />
      <SwitchRow label="Resumo diário por e-mail" />
    </SectionForm>
  );
}

function SectionForm({ title, desc, children }: any) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <div className="space-y-3 pt-2">{children}</div>
      <div className="pt-3 border-t border-border">
        <Button onClick={() => toast.success("Configurações salvas")}><Save className="h-3.5 w-3.5 mr-1.5" /> Salvar alterações</Button>
      </div>
    </div>
  );
}

function Field({ label, type = "text", defaultValue, placeholder }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {type === "textarea"
        ? <Textarea defaultValue={defaultValue} rows={4} />
        : <Input type={type} defaultValue={defaultValue} placeholder={placeholder} />
      }
    </div>
  );
}

function SwitchRow({ label, defaultChecked }: any) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-md border border-border">
      <span className="text-sm">{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
