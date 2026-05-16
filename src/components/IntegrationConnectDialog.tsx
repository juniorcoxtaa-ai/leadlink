import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, ExternalLink, KeyRound, Link2, Lock, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Integration } from "@/lib/mock-data";

interface Props {
  integration: Integration | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConnected: (id: string) => void;
}

const AUTH_LABEL: Record<string, { label: string; icon: any; tone: string }> = {
  oauth: { label: "Login com 1 clique (OAuth)", icon: Sparkles, tone: "text-emerald" },
  api_key: { label: "Chave de API", icon: KeyRound, tone: "text-gold" },
  webhook: { label: "Webhook", icon: Link2, tone: "text-navy" },
  credentials: { label: "Credenciais", icon: Lock, tone: "text-foreground" },
  embed: { label: "Extensão / Embed", icon: Zap, tone: "text-emerald" },
};

export function IntegrationConnectDialog({ integration, open, onOpenChange, onConnected }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setValues({});
  }, [open, integration?.id]);

  if (!integration) return null;
  const meta = AUTH_LABEL[integration.authType];
  const Icon = meta.icon;

  const handleConnect = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    const saved = JSON.parse(window.localStorage.getItem("leadlink:integrations") || "[]") as Integration[];
    const next = saved.length > 0 ? saved : [];
    const idx = next.findIndex((i) => i.id === integration.id);
    if (idx >= 0) next[idx] = { ...next[idx], connected: true };
    else next.push({ ...integration, connected: true });
    window.localStorage.setItem("leadlink:integrations", JSON.stringify(next));
    onConnected(integration.id);
    onOpenChange(false);
    toast.success(`${integration.name} conectado com sucesso!`, {
      description: "Os dados começarão a sincronizar em instantes.",
    });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center font-display text-xl font-semibold">
              {integration.letter}
            </div>
            <div>
              <DialogTitle>{integration.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] rounded-full">{integration.category}</Badge>
                <span className={`inline-flex items-center gap-1 text-[11px] ${meta.tone}`}>
                  <Icon className="h-3 w-3" /> {meta.label}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{integration.description}</p>

        {integration.highlights && integration.highlights.length > 0 && (
          <ul className="space-y-1.5">
            {integration.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2 text-xs">
                <Check className="h-3.5 w-3.5 text-emerald" /> {h}
              </li>
            ))}
          </ul>
        )}

        {/* OAuth */}
        {integration.authType === "oauth" && (
          <div className="rounded-lg border border-border bg-secondary/40 p-4 text-center space-y-3">
            <Sparkles className="h-6 w-6 mx-auto text-emerald" />
            <div className="text-sm">
              Você será redirecionado para autorizar o Leadlink no <strong>{integration.name}</strong>.
            </div>
            <div className="text-[11px] text-muted-foreground">
              Não pedimos sua senha — autenticação 100% segura via OAuth.
            </div>
          </div>
        )}

        {/* Embed */}
        {integration.authType === "embed" && (
          <div className="rounded-lg border border-dashed border-border p-4 text-center space-y-2">
            <div className="text-sm">Instale a extensão Leadlink no seu Chrome.</div>
            <Button variant="outline" size="sm" asChild>
              <a href="#" onClick={(e) => e.preventDefault()}>
                <ExternalLink className="h-3 w-3 mr-1.5" /> Abrir Chrome Web Store
              </a>
            </Button>
          </div>
        )}

        {/* Webhook + form fields */}
        {integration.fields && integration.fields.length > 0 && (
          <div className="space-y-3">
            {integration.fields.map((f) => {
              const isWebhook = f.key === "webhook" && integration.authType === "webhook" && f.placeholder?.startsWith("https://leadlink");
              return (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs">{f.label}</Label>
                  {isWebhook ? (
                    <div className="flex gap-2">
                      <Input value={f.placeholder} readOnly className="font-mono text-[11px] bg-secondary/50" />
                      <Button type="button" variant="outline" size="icon" onClick={() => copy(f.placeholder!)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Input
                      type={f.type}
                      placeholder={f.placeholder}
                      value={values[f.key] || ""}
                      onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                    />
                  )}
                  {f.helper && <p className="text-[11px] text-muted-foreground">{f.helper}</p>}
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-md bg-secondary/40 border border-border/60 p-3 text-[11px] text-muted-foreground flex gap-2">
          <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Suas credenciais são criptografadas e armazenadas com segurança. Você pode revogar a qualquer momento.
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConnect} disabled={loading} className="bg-navy text-navy-foreground hover:bg-navy/90">
            {loading ? "Conectando…" : integration.authType === "oauth" ? `Continuar com ${integration.name}` : "Conectar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
