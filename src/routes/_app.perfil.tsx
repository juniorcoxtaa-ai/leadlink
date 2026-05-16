import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMyProfile, updateUserProfile, checkSlugAvailability } from "@/server-fns/profile";
import { generateSlugFromName, normalizeSlug, validateSlug } from "@/lib/slug";
import { getMySlug } from "@/server-fns/meu-link";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Link2 } from "lucide-react";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({ meta: [{ title: "Perfil do Corretor â€” Leadlink" }] }),
  loader: async () => {
    const [profile, mySlug] = await Promise.all([getMyProfile(), getMySlug().catch(() => null)]);
    return { profile, mySlug };
  },
  component: PerfilPage,
});

type Atuacao = "locacao" | "venda" | "investimento" | "todos";

function PerfilPage() {
  const navigate = useNavigate();
  const { profile, mySlug } = Route.useLoaderData() as {
    profile: Awaited<ReturnType<typeof getMyProfile>>;
    mySlug: string | null;
  };

  const [form, setForm] = useState({
    publicName: "",
    whatsapp: "",
    mainCity: "",
    regionOfOperation: "",
    creci: "",
    atuacao: "todos" as Atuacao,
    instagram: "",
    avatarUrl: "",
    brokerageName: "",
    bio: "",
    especialidades: "",
    slug: "",
  });
  const [slugState, setSlugState] = useState<{ status: "idle" | "checking" | "available" | "unavailable" | "invalid" | "reserved"; message: string }>({ status: "idle", message: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      publicName: profile.publicName || profile.name || "",
      whatsapp: profile.whatsapp || "",
      mainCity: profile.mainCity || "",
      regionOfOperation: profile.regionOfOperation || "",
      creci: profile.creci || "",
      atuacao: (profile.atuacao as Atuacao) || "todos",
      instagram: profile.instagram || "",
      avatarUrl: profile.avatarUrl || "",
      brokerageName: profile.brokerageName || "",
      bio: profile.bio || "",
      especialidades: Array.isArray(profile.especialidades) ? profile.especialidades.join(", ") : "",
      slug: profile.slug || mySlug || "",
    });
  }, [profile, mySlug]);

  const normalizedSlug = useMemo(() => normalizeSlug(form.slug || generateSlugFromName(form.publicName)), [form.slug, form.publicName]);
  const requiredFilled = Boolean(form.publicName.trim() && form.whatsapp.trim() && form.mainCity.trim() && form.creci.trim() && form.atuacao && normalizedSlug);
  const canSave = requiredFilled && slugState.status === "available";
  const profileCompleted = Boolean(profile?.profileCompleted);

  useEffect(() => {
    let cancelled = false;
    if (!normalizedSlug) {
      setSlugState({ status: "idle", message: "" });
      return;
    }
    const parsed = validateSlug(normalizedSlug);
    if (!parsed.ok) {
      setSlugState({
        status: parsed.reason === "reserved" ? "reserved" : "invalid",
        message: parsed.message,
      });
      return;
    }
    setSlugState({ status: "checking", message: "Verificando disponibilidade..." });
    const timer = setTimeout(async () => {
      const result = await (checkSlugAvailability as any)({ data: normalizedSlug });
      if (cancelled) return;
      if (result.available) {
        setSlugState({ status: "available", message: result.ownedByMe ? "Seu slug atual." : "Slug disponível." });
      } else if (result.reason === "reserved") {
        setSlugState({ status: "reserved", message: result.message || "Slug reservado." });
      } else if (result.reason === "format" || result.reason === "length") {
        setSlugState({ status: "invalid", message: result.message || "Slug inválido." });
      } else {
        setSlugState({ status: "unavailable", message: "Este slug já está em uso." });
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedSlug]);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await (updateUserProfile as any)({
        data: {
          ...form,
          slug: normalizedSlug,
          especialidades: form.especialidades.split(",").map((s) => s.trim()).filter(Boolean),
        },
      });
      toast.success("Perfil salvo e Meu Link pré-configurado");
      navigate({ to: "/meu-link" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {!profileCompleted && (
        <Card className="p-4 border-amber-200 bg-amber-50/60 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <div className="font-semibold">Complete seu perfil para liberar o Meu Link</div>
            <div className="text-sm text-muted-foreground">O Meu Link depende dessas informações para ser pré-configurado corretamente.</div>
          </div>
        </Card>
      )}

      <Card className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Onboarding do corretor</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">Perfil profissional</h1>
            <p className="text-sm text-muted-foreground mt-1">Esses dados alimentam automaticamente o Meu Link e a vitrine pública.</p>
          </div>
          <Badge className={profileCompleted ? "bg-emerald/10 text-emerald" : "bg-warning/10 text-warning"}>
            {profileCompleted ? "Perfil completo" : "Pendente"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome público" required>
            <Input value={form.publicName} onChange={(e) => setForm((p) => ({ ...p, publicName: e.target.value }))} />
          </Field>
          <Field label="WhatsApp" required>
            <Input value={form.whatsapp} onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))} />
          </Field>
          <Field label="Cidade principal" required>
            <Input value={form.mainCity} onChange={(e) => setForm((p) => ({ ...p, mainCity: e.target.value }))} />
          </Field>
          <Field label="CRECI" required>
            <Input value={form.creci} onChange={(e) => setForm((p) => ({ ...p, creci: e.target.value }))} />
          </Field>
          <Field label="Tipo de atuação" required>
            <Select value={form.atuacao} onValueChange={(value) => setForm((p) => ({ ...p, atuacao: value as Atuacao }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="locacao">Locação</SelectItem>
                <SelectItem value="venda">Venda</SelectItem>
                <SelectItem value="investimento">Investimento</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Slug / URL da página" required>
            <div className="flex items-center gap-2 rounded-md border border-input px-3 bg-background">
              <span className="text-xs text-muted-foreground whitespace-nowrap">leadlink.com.br/</span>
              <Input
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: normalizeSlug(e.target.value) }))}
                onBlur={() => setForm((p) => ({ ...p, slug: normalizeSlug(p.slug || generateSlugFromName(p.publicName)) }))}
                className="border-0 bg-transparent px-0 focus-visible:ring-0"
                placeholder="seu-nome"
              />
            </div>
            <SlugStatus state={slugState} />
          </Field>
          <Field label="Região de atuação">
            <Input value={form.regionOfOperation} onChange={(e) => setForm((p) => ({ ...p, regionOfOperation: e.target.value }))} />
          </Field>
          <Field label="Instagram">
            <Input value={form.instagram} onChange={(e) => setForm((p) => ({ ...p, instagram: e.target.value }))} />
          </Field>
          <Field label="Foto / avatar URL">
            <Input value={form.avatarUrl} onChange={(e) => setForm((p) => ({ ...p, avatarUrl: e.target.value }))} />
          </Field>
          <Field label="Nome da imobiliária">
            <Input value={form.brokerageName} onChange={(e) => setForm((p) => ({ ...p, brokerageName: e.target.value }))} />
          </Field>
        </div>

        <Field label="Bio curta">
          <Textarea rows={4} value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
        </Field>

        <Field label="Especialidades">
          <Input
            value={form.especialidades}
            onChange={(e) => setForm((p) => ({ ...p, especialidades: e.target.value }))}
            placeholder="alto padrão, lançamentos, investimento"
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald" />
            O Meu Link será ajustado automaticamente com os dados básicos do perfil.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/meu-link">Voltar ao Meu Link</Link>
            </Button>
            <Button onClick={save} disabled={!canSave || saving} className="bg-navy text-navy-foreground hover:bg-navy/90">
              {saving ? "Salvando..." : "Salvar perfil"}
            </Button>
          </div>
        </div>
      </Card>

    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required ? <span className="text-destructive"> *</span> : null}</Label>
      {children}
    </div>
  );
}

function SlugStatus({ state }: { state: { status: string; message: string } }) {
  const tone =
    state.status === "available" ? "text-emerald" :
    state.status === "unavailable" ? "text-destructive" :
    state.status === "reserved" ? "text-amber-600" :
    state.status === "invalid" ? "text-destructive" :
    "text-muted-foreground";
  if (state.status === "idle") return <p className="text-[11px] text-muted-foreground mt-1">Use letras, números e hífen.</p>;
  return <p className={`text-[11px] mt-1 inline-flex items-center gap-1 ${tone}`}>{state.message}</p>;
}
