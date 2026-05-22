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
import {
  DEFAULT_SETTINGS,
  loadAdminSettings,
  saveAdminSettings,
  type AdminSettingsState,
} from "@/lib/admin-platform-store";
import {
  getAdminTrackingSettingsForUI,
  saveAdminTrackingSettings,
  type AdminTrackingSettingsForUI,
} from "@/server-fns/tracking";

export const Route = createFileRoute("/admin/configuracoes")({
  loader: () => getAdminTrackingSettingsForUI(),
  component: AdminSettings,
});

const TABS = [
  { id: "branding", label: "Branding", icon: Palette },
  { id: "domain", label: "Domínio", icon: Globe },
  { id: "trial", label: "Trial e limites", icon: Layers },
  { id: "emails", label: "E-mails", icon: Mail },
  { id: "integrations", label: "Integrações globais", icon: Plug },
  { id: "notifications", label: "Notificações", icon: Bell },
] as const;

function AdminSettings() {
  const tracking = Route.useLoaderData() as AdminTrackingSettingsForUI;
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("branding");
  const [settings, setSettings] = useState<AdminSettingsState>(DEFAULT_SETTINGS);
  const [metaPixelId, setMetaPixelId] = useState(tracking.metaPixelId);
  const [trackingEnabled, setTrackingEnabled] = useState(tracking.trackingEnabled);
  const [metaConversionsApiToken, setMetaConversionsApiToken] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(loadAdminSettings());
    const saved = window.localStorage.getItem("leadlink:admin-settings-tab");
    if (saved && TABS.some((item) => item.id === saved)) {
      setTab(saved as (typeof TABS)[number]["id"]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("leadlink:admin-settings-tab", tab);
  }, [tab]);

  const save = async () => {
    setSaving(true);
    try {
      saveAdminSettings(settings);
      const result = await saveAdminTrackingSettings({
        data: {
          metaPixelId,
          trackingEnabled,
          ...(metaConversionsApiToken.trim()
            ? { metaConversionsApiToken: metaConversionsApiToken.trim() }
            : {}),
        },
      });
      setMetaPixelId(result.metaPixelId);
      setTrackingEnabled(result.trackingEnabled);
      setMetaConversionsApiToken("");
      toast.success("Configurações salvas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-[1100px]">
      <div>
        <h1 className="font-display text-2xl font-semibold">Configurações da plataforma</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes globais que se aplicam a todos os corretores.
        </p>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-5">
        <Card className="p-2 h-fit">
          <nav className="space-y-0.5">
            {TABS.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                  tab === item.id
                    ? "bg-secondary font-medium"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" /> {item.label}
              </button>
            ))}
          </nav>
        </Card>

        <Card className="p-6">
          {tab === "branding" && <Branding settings={settings} setSettings={setSettings} />}
          {tab === "domain" && <Domain settings={settings} setSettings={setSettings} />}
          {tab === "trial" && <Trial settings={settings} setSettings={setSettings} />}
          {tab === "emails" && <Emails settings={settings} setSettings={setSettings} />}
          {tab === "integrations" && (
            <GlobalIntegrations
              settings={settings}
              setSettings={setSettings}
              metaPixelId={metaPixelId}
              onMetaPixelIdChange={setMetaPixelId}
              trackingEnabled={trackingEnabled}
              onTrackingEnabledChange={setTrackingEnabled}
              metaConversionsApiToken={metaConversionsApiToken}
              onMetaConversionsApiTokenChange={setMetaConversionsApiToken}
            />
          )}
          {tab === "notifications" && (
            <Notifications settings={settings} setSettings={setSettings} />
          )}
          <div className="pt-4 mt-4 border-t border-border">
            <Button onClick={() => void save()} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Branding({
  settings,
  setSettings,
}: {
  settings: AdminSettingsState;
  setSettings: React.Dispatch<React.SetStateAction<AdminSettingsState>>;
}) {
  return (
    <Section title="Branding" desc="Logo, cores e identidade visual da plataforma.">
      <Field
        label="Nome da plataforma"
        value={settings.branding.platformName}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            branding: { ...previous.branding, platformName: value },
          }))
        }
      />
      <Field
        label="URL do logo"
        value={settings.branding.logoUrl}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            branding: { ...previous.branding, logoUrl: value },
          }))
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Cor primária"
          type="color"
          value={settings.branding.primaryColor}
          onChange={(value) =>
            setSettings((previous) => ({
              ...previous,
              branding: { ...previous.branding, primaryColor: value },
            }))
          }
        />
        <Field
          label="Cor de destaque"
          type="color"
          value={settings.branding.accentColor}
          onChange={(value) =>
            setSettings((previous) => ({
              ...previous,
              branding: { ...previous.branding, accentColor: value },
            }))
          }
        />
      </div>
    </Section>
  );
}

function Domain({
  settings,
  setSettings,
}: {
  settings: AdminSettingsState;
  setSettings: React.Dispatch<React.SetStateAction<AdminSettingsState>>;
}) {
  return (
    <Section title="Domínio" desc="Domínio principal usado em links públicos dos corretores.">
      <Field
        label="Domínio padrão"
        value={settings.domain.defaultDomain}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            domain: { ...previous.domain, defaultDomain: value },
          }))
        }
      />
      <Field
        label="Subdomínio para links"
        value={settings.domain.linkSubdomain}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            domain: { ...previous.domain, linkSubdomain: value },
          }))
        }
      />
      <SwitchRow
        label="Permitir domínio próprio (apenas plano Comercial IA)"
        checked={settings.domain.allowCustomDomain}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            domain: { ...previous.domain, allowCustomDomain: value },
          }))
        }
      />
    </Section>
  );
}

function Trial({
  settings,
  setSettings,
}: {
  settings: AdminSettingsState;
  setSettings: React.Dispatch<React.SetStateAction<AdminSettingsState>>;
}) {
  return (
    <Section
      title="Trial e limites globais"
      desc="Defina o período de teste e limites do plano Gratuito."
    >
      <Field
        label="Duração do trial (dias)"
        type="number"
        value={String(settings.trial.trialDays)}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            trial: { ...previous.trial, trialDays: Number(value || 0) },
          }))
        }
      />
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Imóveis (Free)"
          type="number"
          value={String(settings.trial.freeProperties)}
          onChange={(value) =>
            setSettings((previous) => ({
              ...previous,
              trial: { ...previous.trial, freeProperties: Number(value || 0) },
            }))
          }
        />
        <Field
          label="Agenda (Free)"
          type="number"
          value={String(settings.trial.freeAgenda)}
          onChange={(value) =>
            setSettings((previous) => ({
              ...previous,
              trial: { ...previous.trial, freeAgenda: Number(value || 0) },
            }))
          }
        />
        <Field
          label="Automações (Free)"
          type="number"
          value={String(settings.trial.freeAutomations)}
          onChange={(value) =>
            setSettings((previous) => ({
              ...previous,
              trial: { ...previous.trial, freeAutomations: Number(value || 0) },
            }))
          }
        />
      </div>
      <SwitchRow
        label="Avisar corretor 7 dias antes do fim do trial"
        checked={settings.trial.warnBeforeEnd}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            trial: { ...previous.trial, warnBeforeEnd: value },
          }))
        }
      />
    </Section>
  );
}

function Emails({
  settings,
  setSettings,
}: {
  settings: AdminSettingsState;
  setSettings: React.Dispatch<React.SetStateAction<AdminSettingsState>>;
}) {
  return (
    <Section
      title="E-mails da plataforma"
      desc="Remetente padrão e templates de e-mails transacionais."
    >
      <Field
        label="Nome do remetente"
        value={settings.emails.senderName}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            emails: { ...previous.emails, senderName: value },
          }))
        }
      />
      <Field
        label="E-mail do remetente"
        value={settings.emails.senderEmail}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            emails: { ...previous.emails, senderEmail: value },
          }))
        }
      />
      <Field
        label="Texto de boas-vindas"
        type="textarea"
        value={settings.emails.welcomeText}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            emails: { ...previous.emails, welcomeText: value },
          }))
        }
      />
    </Section>
  );
}

function GlobalIntegrations({
  settings,
  setSettings,
  metaPixelId,
  onMetaPixelIdChange,
  trackingEnabled,
  onTrackingEnabledChange,
  metaConversionsApiToken,
  onMetaConversionsApiTokenChange,
}: {
  settings: AdminSettingsState;
  setSettings: React.Dispatch<React.SetStateAction<AdminSettingsState>>;
  metaPixelId: string;
  onMetaPixelIdChange: (value: string) => void;
  trackingEnabled: boolean;
  onTrackingEnabledChange: (value: boolean) => void;
  metaConversionsApiToken: string;
  onMetaConversionsApiTokenChange: (value: string) => void;
}) {
  return (
    <Section title="Integrações globais" desc="Chaves de API usadas por toda a plataforma.">
      <div className="rounded-lg border border-border p-4 space-y-3">
        <div>
          <h3 className="font-medium text-sm">Pixel e Rastreamento</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Esse Pixel é da plataforma/admin e deve ser usado nas páginas públicas institucionais da
            LeadLink.
          </p>
        </div>
        <Field
          label="Meta Pixel ID global"
          value={metaPixelId}
          placeholder="Ex.: 123456789012345"
          onChange={onMetaPixelIdChange}
        />
        <SwitchRow
          label="Ativar rastreamento global"
          checked={trackingEnabled}
          onChange={onTrackingEnabledChange}
        />
        <Field
          label="Token da Conversions API (opcional)"
          type="password"
          value={metaConversionsApiToken}
          placeholder="Preparado para uso futuro"
          onChange={onMetaConversionsApiTokenChange}
        />
        <p className="text-xs text-muted-foreground">
          Deixe em branco para manter o token salvo. Preencha para substituÃ­-lo.
        </p>
      </div>
      <Field
        label="WhatsApp Business API token"
        type="password"
        value={settings.integrations.whatsappToken}
        placeholder="••••••••••••"
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            integrations: { ...previous.integrations, whatsappToken: value },
          }))
        }
      />
      <Field
        label="Google Maps API key"
        type="password"
        value={settings.integrations.googleMapsKey}
        placeholder="••••••••••••"
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            integrations: { ...previous.integrations, googleMapsKey: value },
          }))
        }
      />
      <Field
        label="Webhook de monitoramento"
        value={settings.integrations.monitoringWebhook}
        placeholder="https://..."
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            integrations: { ...previous.integrations, monitoringWebhook: value },
          }))
        }
      />
    </Section>
  );
}

function Notifications({
  settings,
  setSettings,
}: {
  settings: AdminSettingsState;
  setSettings: React.Dispatch<React.SetStateAction<AdminSettingsState>>;
}) {
  return (
    <Section title="Notificações administrativas" desc="Alertas enviados para a equipe interna.">
      <SwitchRow
        label="Notificar novo cadastro"
        checked={settings.notifications.newSignup}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            notifications: { ...previous.notifications, newSignup: value },
          }))
        }
      />
      <SwitchRow
        label="Notificar nova assinatura paga"
        checked={settings.notifications.newPaidSubscription}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            notifications: { ...previous.notifications, newPaidSubscription: value },
          }))
        }
      />
      <SwitchRow
        label="Notificar cancelamento"
        checked={settings.notifications.cancellation}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            notifications: { ...previous.notifications, cancellation: value },
          }))
        }
      />
      <SwitchRow
        label="Notificar pagamento em atraso"
        checked={settings.notifications.overduePayment}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            notifications: { ...previous.notifications, overduePayment: value },
          }))
        }
      />
      <SwitchRow
        label="Resumo diário por e-mail"
        checked={settings.notifications.dailyDigest}
        onChange={(value) =>
          setSettings((previous) => ({
            ...previous,
            notifications: { ...previous.notifications, dailyDigest: value },
          }))
        }
      />
    </Section>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {type === "textarea" ? (
        <Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
      ) : (
        <Input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-md border border-border">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
