import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Palette, Globe, Layers, Mail, Plug, Bell, Save } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_SETTINGS, loadAdminSettings, saveAdminSettings, AdminSettingsState } from "@/lib/admin-platform-store";

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
  const [settings, setSettings] = useState<AdminSettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadAdminSettings());
    const saved = window.localStorage.getItem("leadlink:admin-settings-tab");
    if (saved) setTab(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("leadlink:admin-settings-tab", tab);
  }, [tab]);

  const save = () => {
    saveAdminSettings(settings);
    toast.success("Configurações salvas");
  };

  return (
    <div className="space-y-5 max-w-[1100px]">
      <div>
        <h1 className="font-display text-2xl font-semibold">Configurações da plataforma</h1>
        <p className="text-sm text-muted-foreground">Ajustes globais que se aplicam a todos os corretores.</p>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-5">
        <Card className="p-2 h-fit">
          <nav className="space-y-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${tab === t.id ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"}`}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </nav>
        </Card>

        <Card className="p-6">
          {tab === "branding" && <Branding settings={settings} setSettings={setSettings} />}
          {tab === "domain" && <Domain settings={settings} setSettings={setSettings} />}
          {tab === "trial" && <Trial settings={settings} setSettings={setSettings} />}
          {tab === "emails" && <Emails settings={settings} setSettings={setSettings} />}
          {tab === "integrations" && <GlobalIntegrations settings={settings} setSettings={setSettings} />}
          {tab === "notifications" && <Notifications settings={settings} setSettings={setSettings} />}
          <div className="pt-4 mt-4 border-t border-border">
            <Button onClick={save}><Save className="h-3.5 w-3.5 mr-1.5" /> Salvar alterações</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Branding({ settings, setSettings }: { settings: AdminSettingsState; setSettings: React.Dispatch<React.SetStateAction<AdminSettingsState>> }) {
  return (
    <Section title="Branding" desc="Logo, cores e identidade visual da plataforma.">
      <Field label="Nome da plataforma" value={settings.branding.platformName} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, branding: { ...p.branding, platformName: v } }))} />
      <Field label="URL do logo" value={settings.branding.logoUrl} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, branding: { ...p.branding, logoUrl: v } }))} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cor primária" type="color" value={settings.branding.primaryColor} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, branding: { ...p.branding, primaryColor: v } }))} />
        <Field label="Cor de destaque" type="color" value={settings.branding.accentColor} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, branding: { ...p.branding, accentColor: v } }))} />
      </div>
    </Section>
  );
}

function Domain({ settings, setSettings }: { settings: AdminSettingsState; setSettings: React.Dispatch<React.SetStateAction<AdminSettingsState>> }) {
  return (
    <Section title="Domínio" desc="Domínio principal usado em links públicos dos corretores.">
      <Field label="Domínio padrão" value={settings.domain.defaultDomain} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, domain: { ...p.domain, defaultDomain: v } }))} />
      <Field label="Subdomínio para links" value={settings.domain.linkSubdomain} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, domain: { ...p.domain, linkSubdomain: v } }))} />
      <SwitchRow label="Permitir domínio próprio (apenas plano Comercial IA)" checked={settings.domain.allowCustomDomain} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, domain: { ...p.domain, allowCustomDomain: v } }))} />
    </Section>
  );
}

function Trial({ settings, setSettings }: { settings: AdminSettingsState; setSettings: React.Dispatch<React.SetStateAction<AdminSettingsState>> }) {
  return (
    <Section title="Trial e limites globais" desc="Defina o período de teste e limites do plano Gratuito.">
      <Field label="Duração do trial (dias)" type="number" value={String(settings.trial.trialDays)} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, trial: { ...p.trial, trialDays: Number(v || 0) } }))} />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Imóveis (Free)" type="number" value={String(settings.trial.freeProperties)} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, trial: { ...p.trial, freeProperties: Number(v || 0) } }))} />
        <Field label="Agenda (Free)" type="number" value={String(settings.trial.freeAgenda)} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, trial: { ...p.trial, freeAgenda: Number(v || 0) } }))} />
        <Field label="Automações (Free)" type="number" value={String(settings.trial.freeAutomations)} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, trial: { ...p.trial, freeAutomations: Number(v || 0) } }))} />
      </div>
      <SwitchRow label="Avisar corretor 7 dias antes do fim do trial" checked={settings.trial.warnBeforeEnd} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, trial: { ...p.trial, warnBeforeEnd: v } }))} />
    </Section>
  );
}

function Emails({ settings, setSettings }: { settings: AdminSettingsState; setSettings: React.Dispatch<React.SetStateAction<AdminSettingsState>> }) {
  return (
    <Section title="E-mails da plataforma" desc="Remetente padrão e templates de e-mails transacionais.">
      <Field label="Nome do remetente" value={settings.emails.senderName} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, emails: { ...p.emails, senderName: v } }))} />
      <Field label="E-mail do remetente" value={settings.emails.senderEmail} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, emails: { ...p.emails, senderEmail: v } }))} />
      <Field label="Texto de boas-vindas" type="textarea" value={settings.emails.welcomeText} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, emails: { ...p.emails, welcomeText: v } }))} />
    </Section>
  );
}

function GlobalIntegrations({ settings, setSettings }: { settings: AdminSettingsState; setSettings: React.Dispatch<React.SetStateAction<AdminSettingsState>> }) {
  return (
    <Section title="Integrações globais" desc="Chaves de API usadas por toda a plataforma.">
      <Field label="WhatsApp Business API token" type="password" value={settings.integrations.whatsappToken} placeholder="••••••••••••" onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, integrations: { ...p.integrations, whatsappToken: v } }))} />
      <Field label="Google Maps API key" type="password" value={settings.integrations.googleMapsKey} placeholder="••••••••••••" onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, integrations: { ...p.integrations, googleMapsKey: v } }))} />
      <Field label="Webhook de monitoramento" value={settings.integrations.monitoringWebhook} placeholder="https://..." onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, integrations: { ...p.integrations, monitoringWebhook: v } }))} />
    </Section>
  );
}

function Notifications({ settings, setSettings }: { settings: AdminSettingsState; setSettings: React.Dispatch<React.SetStateAction<AdminSettingsState>> }) {
  return (
    <Section title="Notificações administrativas" desc="Alertas enviados para a equipe interna.">
      <SwitchRow label="Notificar novo cadastro" checked={settings.notifications.newSignup} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, notifications: { ...p.notifications, newSignup: v } }))} />
      <SwitchRow label="Notificar nova assinatura paga" checked={settings.notifications.newPaidSubscription} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, notifications: { ...p.notifications, newPaidSubscription: v } }))} />
      <SwitchRow label="Notificar cancelamento" checked={settings.notifications.cancellation} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, notifications: { ...p.notifications, cancellation: v } }))} />
      <SwitchRow label="Notificar pagamento em atraso" checked={settings.notifications.overduePayment} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, notifications: { ...p.notifications, overduePayment: v } }))} />
      <SwitchRow label="Resumo diário por e-mail" checked={settings.notifications.dailyDigest} onChange={(v) => setSettings((p: AdminSettingsState) => ({ ...p, notifications: { ...p.notifications, dailyDigest: v } }))} />
    </Section>
  );
}

function Section({ title, desc, children }: any) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <div className="space-y-3 pt-2">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {type === "textarea" ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} />
      ) : (
        <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-md border border-border">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
