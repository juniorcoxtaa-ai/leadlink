import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Crown,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  Sparkles,
  Upload,
  User,
  Wallet,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getMyProfile, updateMyProfile, updateBillingInfo } from "@/server-fns/profile";
import { createCustomerPortalSession } from "@/server-fns/stripe";
import { calculateProfileCompleteness, getUserPlan } from "@/lib/plans";
import { normalizeSlug } from "@/lib/slug";
import { uploadImage } from "@/lib/meu-link-store";
import { safeSrc } from "@/lib/media";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Lead Link" }] }),
  loader: async () => {
    const profile = await getMyProfile();
    return { profile };
  },
  component: ConfiguracoesPage,
});

type ProfileForm = {
  displayName: string;
  slug: string;
  bio: string;
  creci: string;
  specialty: string;
  yearsExperience: string;
  city: string;
  state: string;
  avatarUrl: string;
  coverImageUrl: string;
  whatsappNumber: string;
  instagramUrl: string;
  websiteUrl: string;
  regionOfOperation: string;
  atuacao: string;
  cpfCnpj: string;
  billingName: string;
  billingEmail: string;
  billingAddressZip: string;
  billingAddressLine1: string;
  billingAddressCity: string;
  billingAddressState: string;
};

const emptyForm: ProfileForm = {
  displayName: "",
  slug: "",
  bio: "",
  creci: "",
  specialty: "",
  yearsExperience: "",
  city: "",
  state: "",
  avatarUrl: "",
  coverImageUrl: "",
  whatsappNumber: "",
  instagramUrl: "",
  websiteUrl: "",
  regionOfOperation: "",
  atuacao: "todos",
  cpfCnpj: "",
  billingName: "",
  billingEmail: "",
  billingAddressZip: "",
  billingAddressLine1: "",
  billingAddressCity: "",
  billingAddressState: "",
};

function ConfiguracoesPage() {
  const { profile } = Route.useLoaderData() as {
    profile: Awaited<ReturnType<typeof getMyProfile>>;
  };
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [billingSaving, setBillingSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setForm({
      displayName: profile.displayName ?? profile.publicName ?? profile.name ?? "",
      slug: profile.slug ?? "",
      bio: profile.bio ?? "",
      creci: profile.creci ?? "",
      specialty: Array.isArray(profile.specialty) ? profile.specialty.join(", ") : "",
      yearsExperience:
        typeof profile.yearsExperience === "number" ? String(profile.yearsExperience) : "",
      city: profile.city ?? profile.mainCity ?? "",
      state: profile.state ?? "",
      avatarUrl: profile.avatarUrl ?? "",
      coverImageUrl: profile.coverImageUrl ?? "",
      whatsappNumber: profile.whatsappNumber ?? profile.whatsapp ?? "",
      instagramUrl: profile.instagramUrl ?? profile.instagram ?? "",
      websiteUrl: profile.websiteUrl ?? "",
      regionOfOperation: profile.regionOfOperation ?? "",
      atuacao: profile.atuacao ?? "todos",
      cpfCnpj: profile.cpfCnpj ?? "",
      billingName: profile.billingName ?? "",
      billingEmail: profile.billingEmail ?? "",
      billingAddressZip: profile.billingAddressZip ?? "",
      billingAddressLine1: profile.billingAddressLine1 ?? "",
      billingAddressCity: profile.billingAddressCity ?? "",
      billingAddressState: profile.billingAddressState ?? "",
    });
  }, [profile]);

  const completeness = useMemo(() => calculateProfileCompleteness(profile ?? {}), [profile]);
  const plan = useMemo(() => getUserPlan(profile ?? null), [profile]);
  const publicUrl = form.slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/${normalizeSlug(form.slug)}`
    : "";
  const billingReady = Boolean(
    form.cpfCnpj &&
    form.billingName &&
    form.billingEmail &&
    form.billingAddressZip &&
    form.billingAddressLine1 &&
    form.billingAddressCity &&
    form.billingAddressState,
  );

  const uploadProfileImage = async (field: "avatarUrl" | "coverImageUrl", file?: File) => {
    if (!file) return;
    const isCover = field === "coverImageUrl";
    const maxSize = isCover ? 12 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Imagem muito grande (máx. ${isCover ? 12 : 8} MB)`);
      return;
    }
    try {
      const url = await uploadImage(file, form.slug || profile?.slug || "perfil", isCover ? "bg" : "photo");
      setForm((curr) => ({ ...curr, [field]: url }));
      toast.success(isCover ? "Capa enviada" : "Avatar enviado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem");
    }
  };

  const saveIdentity = async () => {
    setProfileSaving(true);
    try {
      await updateMyProfile({
        data: {
          displayName: form.displayName,
          slug: normalizeSlug(form.slug || form.displayName),
          bio: form.bio,
          creci: form.creci,
          specialty: form.specialty
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
          city: form.city,
          state: form.state,
          avatarUrl: form.avatarUrl,
          coverImageUrl: form.coverImageUrl,
          whatsappNumber: form.whatsappNumber,
          instagramUrl: form.instagramUrl,
          websiteUrl: form.websiteUrl,
          regionOfOperation: form.regionOfOperation,
          atuacao: form.atuacao,
        },
      });
      toast.success("Perfil salvo com sucesso");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar perfil");
    } finally {
      setProfileSaving(false);
    }
  };

  const saveBilling = async () => {
    setBillingSaving(true);
    try {
      await updateBillingInfo({
        data: {
          cpfCnpj: form.cpfCnpj,
          billingName: form.billingName,
          billingEmail: form.billingEmail,
          billingAddressZip: form.billingAddressZip,
          billingAddressLine1: form.billingAddressLine1,
          billingAddressCity: form.billingAddressCity,
          billingAddressState: form.billingAddressState,
        },
      });
      toast.success("Cobrança salva com sucesso");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar cobrança");
    } finally {
      setBillingSaving(false);
    }
  };

  const lookupCep = async () => {
    const cep = form.billingAddressZip.replace(/\D/g, "");
    if (cep.length !== 8) {
      toast.error("Digite um CEP válido");
      return;
    }
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data || data.erro) throw new Error("CEP não encontrado");
      setForm((curr) => ({
        ...curr,
        billingAddressLine1: [data.logradouro, data.bairro].filter(Boolean).join(", "),
        billingAddressCity: data.localidade ?? curr.billingAddressCity,
        billingAddressState: data.uf ?? curr.billingAddressState,
      }));
      toast.success("CEP preenchido");
    } catch {
      toast.error("Não foi possível buscar o CEP agora");
    } finally {
      setCepLoading(false);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const result = await createCustomerPortalSession({ data: {} });
      if (result?.url) window.location.href = result.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao abrir portal");
    } finally {
      setPortalLoading(false);
    }
  };

  if (!profile) {
    return (
      <EmptyState
        icon={<User className="h-5 w-5" />}
        title="Perfil ainda não carregado"
        description="Recarregue a página para buscar seus dados de configurações."
        action={<Button onClick={() => window.location.reload()}>Recarregar</Button>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="p-5 border-border/70 bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              Central do corretor
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Configurações e perfil completo
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Ajuste sua identidade pública, dados de cobrança e acompanhe seu plano sem precisar
              sair desta tela.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Card className="p-3 border-border/70 bg-background/80">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Plano atual
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge className="bg-gold/15 text-gold border border-gold/30">
                  {plan.planSlug.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">{plan.planStatus}</span>
              </div>
            </Card>
            <Card className="p-3 border-border/70 bg-background/80">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Completude
              </div>
              <div className="mt-1 text-lg font-semibold">{completeness.percentage}%</div>
            </Card>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-border/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Completude do perfil</div>
            <p className="text-xs text-muted-foreground">
              Complete os campos principais para melhorar sua vitrine pública e o Meu Link.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            {completeness.percentage}% concluído
          </Badge>
        </div>
        <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-amber-500"
            style={{ width: `${completeness.percentage}%` }}
          />
        </div>
        {completeness.missingFields.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {completeness.missingFields.slice(0, 6).map((field) => (
              <Badge key={field} variant="outline" className="text-xs">
                {field}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Tabs defaultValue="identidade" className="space-y-4">
        <TabsList className="flex flex-wrap gap-2 bg-secondary p-1 w-full justify-start">
          <TabsTrigger value="identidade">Identidade pública</TabsTrigger>
          <TabsTrigger value="atendimento">Atendimento e redes</TabsTrigger>
          <TabsTrigger value="cobranca">Cobrança</TabsTrigger>
          <TabsTrigger value="plano">Plano e assinatura</TabsTrigger>
        </TabsList>

        <TabsContent value="identidade" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Identidade pública</h2>
                <p className="text-sm text-muted-foreground">
                  Esses dados compõem sua página pública e o Meu Link.
                </p>
              </div>
              <Badge variant="outline">Slug único e normalizado</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome público">
                <Input
                  value={form.displayName}
                  onChange={(e) => setForm((curr) => ({ ...curr, displayName: e.target.value }))}
                />
              </Field>
              <Field label="Slug / endereço personalizado">
                <Input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((curr) => ({ ...curr, slug: normalizeSlug(e.target.value) }))
                  }
                />
              </Field>
              <Field label="CRECI">
                <Input
                  value={form.creci}
                  onChange={(e) => setForm((curr) => ({ ...curr, creci: e.target.value }))}
                />
              </Field>
              <Field label="Anos de experiência">
                <Input
                  type="number"
                  min={0}
                  value={form.yearsExperience}
                  onChange={(e) =>
                    setForm((curr) => ({ ...curr, yearsExperience: e.target.value }))
                  }
                />
              </Field>
              <Field label="Cidade">
                <Input
                  value={form.city}
                  onChange={(e) => setForm((curr) => ({ ...curr, city: e.target.value }))}
                />
              </Field>
              <Field label="Estado">
                <Input
                  value={form.state}
                  onChange={(e) => setForm((curr) => ({ ...curr, state: e.target.value }))}
                />
              </Field>
              <Field label="Foto / avatar">
                <div className="space-y-2">
                  {safeSrc(form.avatarUrl) && (
                    <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border bg-secondary">
                      <img src={safeSrc(form.avatarUrl)} alt="Avatar" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm((curr) => ({ ...curr, avatarUrl: "" }))}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <Input
                    value={form.avatarUrl}
                    onChange={(e) => setForm((curr) => ({ ...curr, avatarUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => uploadProfileImage("avatarUrl", e.target.files?.[0])}
                  />
                  <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar avatar
                  </Button>
                </div>
              </Field>
              <Field label="Foto de capa">
                <div className="space-y-2">
                  {safeSrc(form.coverImageUrl) && (
                    <div className="relative h-28 overflow-hidden rounded-lg border border-border bg-secondary">
                      <img src={safeSrc(form.coverImageUrl)} alt="Capa" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm((curr) => ({ ...curr, coverImageUrl: "" }))}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <Input
                    value={form.coverImageUrl}
                    onChange={(e) => setForm((curr) => ({ ...curr, coverImageUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => uploadProfileImage("coverImageUrl", e.target.files?.[0])}
                  />
                  <Button type="button" variant="outline" onClick={() => coverInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar capa
                  </Button>
                </div>
              </Field>
            </div>
            <Field label="Bio">
              <Textarea
                rows={4}
                value={form.bio}
                onChange={(e) => setForm((curr) => ({ ...curr, bio: e.target.value }))}
              />
            </Field>
            <Field label="Especialidades">
              <Input
                value={form.specialty}
                onChange={(e) => setForm((curr) => ({ ...curr, specialty: e.target.value }))}
                placeholder="alto padrão, lançamentos, investimento"
              />
            </Field>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-xs text-muted-foreground">
                Preview público:{" "}
                {publicUrl ? (
                  <Link
                    to="/perfil"
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    {publicUrl}
                  </Link>
                ) : (
                  "Configure o slug para gerar o link público"
                )}
              </div>
              <Button
                onClick={saveIdentity}
                disabled={profileSaving}
                className="bg-navy text-navy-foreground hover:bg-navy/90"
              >
                {profileSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar identidade
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="atendimento" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Atendimento e redes</h2>
              <p className="text-sm text-muted-foreground">
                Dados de contato e posicionamento comercial.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="WhatsApp">
                <Input
                  value={form.whatsappNumber}
                  onChange={(e) => setForm((curr) => ({ ...curr, whatsappNumber: e.target.value }))}
                />
              </Field>
              <Field label="Instagram">
                <Input
                  value={form.instagramUrl}
                  onChange={(e) => setForm((curr) => ({ ...curr, instagramUrl: e.target.value }))}
                />
              </Field>
              <Field label="Website">
                <Input
                  value={form.websiteUrl}
                  onChange={(e) => setForm((curr) => ({ ...curr, websiteUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Região de atuação">
                <Input
                  value={form.regionOfOperation}
                  onChange={(e) =>
                    setForm((curr) => ({ ...curr, regionOfOperation: e.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label="Tipo de atuação">
              <div className="grid gap-2 sm:grid-cols-4">
                {[
                  ["locacao", "Locação"],
                  ["venda", "Venda"],
                  ["investimento", "Investimento"],
                  ["todos", "Todos"],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant={form.atuacao === value ? "default" : "outline"}
                    onClick={() => setForm((curr) => ({ ...curr, atuacao: value }))}
                    className={form.atuacao === value ? "bg-navy text-navy-foreground" : ""}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </Field>
            <div className="flex justify-end">
              <Button
                onClick={saveIdentity}
                disabled={profileSaving}
                className="bg-navy text-navy-foreground hover:bg-navy/90"
              >
                {profileSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar atendimento
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="cobranca" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Cobrança</h2>
                <p className="text-sm text-muted-foreground">
                  Esses dados são usados no checkout Stripe e na emissão interna.
                </p>
              </div>
              {!billingReady ? (
                <Badge variant="outline" className="border-amber-300 text-amber-700">
                  Dados incompletos
                </Badge>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="CPF/CNPJ">
                <Input
                  value={form.cpfCnpj}
                  onChange={(e) => setForm((curr) => ({ ...curr, cpfCnpj: e.target.value }))}
                />
              </Field>
              <Field label="Nome para cobrança">
                <Input
                  value={form.billingName}
                  onChange={(e) => setForm((curr) => ({ ...curr, billingName: e.target.value }))}
                />
              </Field>
              <Field label="Email de cobrança">
                <Input
                  type="email"
                  value={form.billingEmail}
                  onChange={(e) => setForm((curr) => ({ ...curr, billingEmail: e.target.value }))}
                />
              </Field>
              <Field label="CEP">
                <div className="flex gap-2">
                  <Input
                    value={form.billingAddressZip}
                    onChange={(e) =>
                      setForm((curr) => ({ ...curr, billingAddressZip: e.target.value }))
                    }
                  />
                  <Button variant="outline" type="button" onClick={lookupCep} disabled={cepLoading}>
                    {cepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                  </Button>
                </div>
              </Field>
              <Field label="Endereço">
                <Input
                  value={form.billingAddressLine1}
                  onChange={(e) =>
                    setForm((curr) => ({ ...curr, billingAddressLine1: e.target.value }))
                  }
                />
              </Field>
              <Field label="Cidade">
                <Input
                  value={form.billingAddressCity}
                  onChange={(e) =>
                    setForm((curr) => ({ ...curr, billingAddressCity: e.target.value }))
                  }
                />
              </Field>
              <Field label="Estado">
                <Input
                  value={form.billingAddressState}
                  onChange={(e) =>
                    setForm((curr) => ({ ...curr, billingAddressState: e.target.value }))
                  }
                />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Preencha a cobrança antes de seguir para o checkout.
              </div>
              <Button
                onClick={saveBilling}
                disabled={billingSaving}
                className="bg-navy text-navy-foreground hover:bg-navy/90"
              >
                {billingSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Wallet className="h-4 w-4 mr-2" />
                )}
                Salvar cobrança
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="plano" className="space-y-4">
          <Card className="p-6 space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-gold">
                  <Crown className="h-4 w-4" />
                  Plano e assinatura
                </div>
                <h2 className="text-xl font-semibold mt-1">Seu plano atual</h2>
                <p className="text-sm text-muted-foreground">
                  Planos e Stripe são somente leitura nesta tela.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link to="/planos">Ver planos</Link>
                </Button>
                <Button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="bg-gold text-navy hover:bg-gold/90 font-semibold"
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                  )}
                  Portal Stripe
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Info label="Plano" value={plan.planSlug.toUpperCase()} />
              <Info label="Status" value={plan.planStatus} />
              <Info
                label="Aquisição"
                value={
                  plan.acquiredAt ? new Date(plan.acquiredAt).toLocaleString("pt-BR") : "Sem dados"
                }
              />
              <Info
                label="Renovação"
                value={
                  plan.expiresAt ? new Date(plan.expiresAt).toLocaleString("pt-BR") : "Sem dados"
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4 border-border/70 bg-secondary/20">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Pagamento resumido
                </div>
                <div className="mt-1 text-sm font-medium">
                  {profile?.paymentMethodBrand && profile?.paymentMethodLast4
                    ? `${profile.paymentMethodBrand} •••• ${profile.paymentMethodLast4}`
                    : "Sem método salvo"}
                </div>
              </Card>
              <Card className="p-4 border-border/70 bg-secondary/20">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Stripe</div>
                <div className="mt-1 text-sm font-medium break-all">
                  {profile?.stripeCustomerId ?? "stripeCustomerId não disponível"}
                </div>
                <div className="mt-1 text-sm font-medium break-all">
                  {profile?.stripeSubscriptionId ?? "stripeSubscriptionId não disponível"}
                </div>
              </Card>
            </div>

            {!billingReady && (
              <Card className="p-4 border-amber-200 bg-amber-50/70 flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-semibold">Cobrança incompleta</div>
                  <div className="text-sm text-muted-foreground">
                    Preencha os dados de cobrança antes de iniciar um novo checkout.
                  </div>
                </div>
              </Card>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 border-border/70">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </Card>
  );
}
