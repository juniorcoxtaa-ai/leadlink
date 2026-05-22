import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  ExternalLink,
  QrCode,
  Save,
  Plus,
  Trash2,
  User,
  Palette,
  Link2,
  Sparkles,
  Eye,
  HelpCircle,
  Home,
  Lock,
  GripVertical,
  Check,
  MessageCircle,
  Upload,
  Image as ImageIcon,
  X,
  BadgeCheck,
  Type,
  Square,
  Video as VideoIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getProperties } from "@/server-fns/properties";
import { getMyProfile } from "@/server-fns/profile";
import {
  EMPTY_MEU_LINK_CONFIG,
  uploadImage,
  loadConfig,
  saveConfig,
  ACCENT_TOKENS,
  BG_PRESETS,
  FONT_FAMILIES,
  BTN_RADIUS,
  type MeuLinkConfig,
  type Question,
  type QuestionType,
  type Accent,
  type BgStyle,
  type FontStyle,
  type BtnShape,
} from "@/lib/meu-link-store";
import {
  DEFAULT_QUIZ_BLOCKS,
  type QuizBlocks,
  type QuizIntent,
  type QuizQuestion,
} from "@/lib/quiz-blocks";
import { MeuLinkPreview } from "@/components/MeuLinkPreview";
import { safeSrc } from "@/lib/media";
import { maskPhoneBR, onlyDigits } from "@/lib/masks";
import { EmptyState } from "@/components/EmptyState";
import { openUrlWithFallback } from "@/lib/open-url";

type AvailableProperty = Awaited<ReturnType<typeof getProperties>>[number];

export const Route = createFileRoute("/_app/meu-link")({
  head: () => ({ meta: [{ title: "Meu Link — Leadlink" }] }),
  component: MeuLinkPage,
});

function MeuLinkPage() {
  const [cfg, setCfg] = useState<MeuLinkConfig>(EMPTY_MEU_LINK_CONFIG);
  const [hydrated, setHydrated] = useState(false);
  const [hasRemoteConfig, setHasRemoteConfig] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [qrOpen, setQrOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const vitrineCoverInputRef = useRef<HTMLInputElement>(null);

  const { data: availableProps = [] } = useQuery({
    queryKey: ["meu-link", "properties"],
    queryFn: () => getProperties(),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const { data: profile = null } = useQuery({
    queryKey: ["meu-link", "profile"],
    queryFn: () => getMyProfile(),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const { data: remoteConfig = EMPTY_MEU_LINK_CONFIG } = useQuery({
    queryKey: ["meu-link", "config"],
    queryFn: () => loadConfig(),
    staleTime: 90_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  useEffect(() => {
    setCfg(remoteConfig);
    setHasRemoteConfig(Boolean(remoteConfig.slug));
    setHydrated(true);
  }, [remoteConfig]);

  // Auto-persiste a cada edição (depois da hidratação)
  useEffect(() => {
    if (!hydrated || !hasRemoteConfig) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      const r = await saveConfig(cfg);
      if (r.ok) {
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1200);
      } else {
        setSaveState("error");
        toast.error(r.message);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [cfg, hydrated, hasRemoteConfig]);

  const update = <K extends keyof MeuLinkConfig>(key: K, value: MeuLinkConfig[K]) => {
    setHasRemoteConfig(true);
    setCfg((c) => ({ ...c, [key]: value }));
  };
  const resolvedSlug = (cfg.slug || profile?.slug || "").trim();
  const publicLink =
    resolvedSlug && typeof window !== "undefined"
      ? `${window.location.origin}/l/${resolvedSlug}`
      : "";
  const fullUrl = resolvedSlug
    ? `leadlink.com.br/${resolvedSlug}`
    : "Configure seu endereço personalizado primeiro";
  const profileCompleted = Boolean(profile?.profileCompleted);
  const missingSlug = !resolvedSlug;

  // STATS
  const addStat = () =>
    cfg.stats.length < 3 &&
    update("stats", [...cfg.stats, { id: Date.now().toString(), label: "Novo dado", value: "—" }]);
  const removeStat = (id: string) =>
    update(
      "stats",
      cfg.stats.filter((s) => s.id !== id),
    );
  const updateStat = (id: string, field: "label" | "value", v: string) =>
    update(
      "stats",
      cfg.stats.map((s) => (s.id === id ? { ...s, [field]: v } : s)),
    );

  // LINKS
  const addLink = () =>
    update("links", [
      ...cfg.links,
      { id: Date.now().toString(), label: "Novo link", url: "", enabled: true },
    ]);
  const removeLink = (id: string) =>
    update(
      "links",
      cfg.links.filter((l) => l.id !== id),
    );
  const updateLink = (id: string, field: "label" | "url" | "enabled", v: string | boolean) =>
    update(
      "links",
      cfg.links.map((l) => (l.id === id ? { ...l, [field]: v } : l)),
    );

  // QUIZ
  const quizBlocks = cfg.quizBlocks ?? DEFAULT_QUIZ_BLOCKS;
  const enabledBlockCount = Object.values(quizBlocks).filter((block) => block.enabled).length;
  const [activeQuizIntent, setActiveQuizIntent] = useState<QuizIntent>("locacao");
  const updateBlock = (intent: QuizIntent, patch: Partial<(typeof quizBlocks)[QuizIntent]>) =>
    update("quizBlocks", {
      ...quizBlocks,
      [intent]: {
        ...quizBlocks[intent],
        ...patch,
      },
    } as QuizBlocks);
  const toggleBlock = (intent: QuizIntent, enabled: boolean) => updateBlock(intent, { enabled });
  const updateQuizQuestion = (intent: QuizIntent, id: string, patch: Partial<QuizQuestion>) =>
    updateBlock(intent, {
      questions: quizBlocks[intent].questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    });
  const toggleQuizQuestion = (intent: QuizIntent, id: string, enabled: boolean) =>
    updateQuizQuestion(intent, id, { enabled });
  const updateQuizOptions = (intent: QuizIntent, id: string, options: string[]) =>
    updateQuizQuestion(intent, id, { options });
  const renderQuizBlock = (intent: QuizIntent, title: string, subtitle: string) => {
    const block = quizBlocks[intent];
    return (
      <div
        className={`rounded-xl border p-4 space-y-3 ${block.enabled ? "border-border bg-card" : "border-border bg-muted/30 opacity-70"}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">{title}</div>
            <div className="text-[11px] text-muted-foreground">{subtitle}</div>
          </div>
          <Switch checked={block.enabled} onCheckedChange={(v) => toggleBlock(intent, v)} />
        </div>
        <div className="space-y-2">
          {block.questions.map((q) => (
            <div key={q.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={q.label}
                  onChange={(e) => updateQuizQuestion(intent, q.id, { label: e.target.value })}
                  className="font-medium text-sm"
                />
                <Switch
                  checked={q.enabled !== false}
                  onCheckedChange={(v) => toggleQuizQuestion(intent, q.id, v)}
                />
              </div>
              <div className="grid gap-2 md:grid-cols-[1fr_160px]">
                <Input
                  value={q.placeholder || ""}
                  onChange={(e) =>
                    updateQuizQuestion(intent, q.id, { placeholder: e.target.value })
                  }
                  placeholder="Placeholder / ajuda"
                  className="text-xs"
                />
                <Select
                  value={q.type}
                  onValueChange={(v: QuestionType) => updateQuizQuestion(intent, q.id, { type: v })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="tel">Telefone</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="select">Múltipla escolha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {q.type === "select" && (
                <div className="space-y-1.5">
                  <Input
                    value={(q.options || []).join(" | ")}
                    onChange={(e) =>
                      updateQuizOptions(
                        intent,
                        q.id,
                        e.target.value
                          .split("|")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="Opção 1 | Opção 2 | Opção 3"
                    className="text-xs font-mono h-8"
                  />
                  <div className="text-[10px] text-muted-foreground">
                    Separe as opções por <code>|</code>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  const selectedQuizBlock = renderQuizBlock(
    activeQuizIntent,
    activeQuizIntent === "locacao"
      ? "Locação"
      : activeQuizIntent === "compra"
        ? "Compra"
        : "Investimento",
    activeQuizIntent === "locacao"
      ? "Perguntas para quem quer alugar um imóvel."
      : activeQuizIntent === "compra"
        ? "Perguntas para quem quer comprar um imóvel."
        : "Perguntas para quem busca oportunidades de investimento.",
  );

  // FEATURED
  const toggleFeatured = (id: string) => {
    if (cfg.featuredIds.includes(id))
      update(
        "featuredIds",
        cfg.featuredIds.filter((f) => f !== id),
      );
    else {
      if (cfg.featuredIds.length >= 6) return toast.error("Máximo de 6 imóveis em destaque");
      update("featuredIds", [...cfg.featuredIds, id]);
    }
  };

  // VIDEOS
  const addVideo = () => {
    if ((cfg.videos?.length ?? 0) >= 6) return toast.error("Máximo de 6 vídeos");
    update("videos", [
      ...(cfg.videos ?? []),
      { id: `v-${Date.now()}`, title: "Novo vídeo", url: "", enabled: true },
    ]);
  };
  const removeVideo = (id: string) =>
    update(
      "videos",
      (cfg.videos ?? []).filter((v) => v.id !== id),
    );
  const updateVideo = (
    id: string,
    patch: Partial<{ title: string; url: string; enabled: boolean }>,
  ) =>
    update(
      "videos",
      (cfg.videos ?? []).map((v) => (v.id === id ? { ...v, ...patch } : v)),
    );

  // UPLOADS — sobe pro Storage e usa URL pública
  const handlePhotoUpload = async (file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast.error("Imagem muito grande (máx. 8 MB)");
    try {
      const url = await uploadImage(file, cfg.slug, "photo");
      update("photoUrl", url);
      toast.success("Foto de perfil atualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a imagem");
    }
  };

  const handleBgUpload = async (file?: File) => {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) return toast.error("Imagem muito grande (máx. 12 MB)");
    try {
      const url = await uploadImage(file, cfg.slug, "bg");
      setHasRemoteConfig(true);
      setCfg((c) => ({ ...c, bgImage: url }));
      toast.success("Imagem de fundo aplicada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a imagem");
    }
  };

  const openPublic = async () => {
    if (!resolvedSlug) {
      toast.warning("Configure seu endereço personalizado primeiro");
      return;
    }
    const r = await saveConfig({ ...cfg, slug: resolvedSlug });
    if (!r.ok) return toast.error(r.message);
    const targetUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/l/${resolvedSlug}`
        : `/l/${resolvedSlug}`;
    openUrlWithFallback(targetUrl);
  };

  const handleVitrineCoverUpload = async (file?: File) => {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) return toast.error("Imagem muito grande (máx. 12 MB)");
    try {
      const url = await uploadImage(file, cfg.slug, "bg");
      update("vitrine", {
        ...(cfg.vitrine ?? { coverUrl: "", accentColor: "navy" }),
        coverUrl: url,
      });
      toast.success("Capa da vitrine atualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a imagem");
    }
  };

  const copyPublicLink = async () => {
    if (!resolvedSlug || !publicLink) {
      toast.warning("Configure seu endereço personalizado primeiro");
      return;
    }
    await navigator.clipboard.writeText(publicLink);
    toast.success("Link copiado");
  };

  const openQrCode = () => {
    if (!resolvedSlug) {
      toast.warning("Configure seu endereço personalizado primeiro");
      return;
    }
    setQrOpen(true);
  };

  if (!hydrated) return <MeuLinkSkeleton />;

  return (
    <>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {!profileCompleted && (
          <Card className="p-4 border-amber-200 bg-amber-50/60 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Seu perfil está incompleto</div>
              <div className="text-sm text-muted-foreground">
                Complete o perfil do corretor para garantir a pré-configuração correta do Meu Link.
              </div>
            </div>
            <Button asChild className="bg-navy text-navy-foreground hover:bg-navy/90">
              <Link to="/configuracoes">Completar perfil</Link>
            </Button>
          </Card>
        )}
        {missingSlug && (
          <EmptyState
            icon={<Link2 className="h-5 w-5" />}
            title="Configure seu endereço personalizado"
            description="Defina um slug nas configurações para copiar, abrir e compartilhar seu Meu Link com segurança."
            action={
              <Button asChild>
                <Link to="/configuracoes">Configurar slug</Link>
              </Button>
            }
            className="py-7"
          />
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              LeadLink · Corretor
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-1">
              Meu link
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bom te ver, {cfg.name.split(" ")[0]}. Edite ao vivo — as alterações são salvas
              automaticamente.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[11px]">
                {missingSlug ? "Slug não configurado" : `Slug público: ${profile?.slug}`}
              </Badge>
              <Button asChild variant="ghost" size="sm" className="h-7 rounded-full">
                <Link to="/configuracoes">Editar perfil</Link>
              </Button>
            </div>
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 touch-manipulation rounded-full"
              onClick={copyPublicLink}
            >
              <Copy className="h-4 w-4 mr-1.5" /> Copiar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 touch-manipulation rounded-full"
              onClick={openQrCode}
            >
              <QrCode className="h-4 w-4 mr-1.5" /> QR
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 touch-manipulation rounded-full"
              onClick={openPublic}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" /> Ver link público
            </Button>
            <Button
              type="button"
              className="min-h-11 touch-manipulation rounded-full bg-emerald text-emerald-foreground hover:bg-emerald/90"
              onClick={async () => {
                const r = await saveConfig(cfg);
                if (r.ok) toast.success("Alterações salvas");
                else toast.error(r.message);
              }}
            >
              <Save className="h-4 w-4 mr-1.5" /> Salvar
            </Button>
            <SaveBadge state={saveState} />
          </div>
        </div>

        {/* Status row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-4 border-border/70 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald/10 text-emerald flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Quiz
              </div>
              <div className="text-sm font-medium truncate">{enabledBlockCount} blocos ativos</div>
            </div>
            <Badge variant="outline" className="ml-auto text-[10px] border-emerald/30 text-emerald">
              Pronto
            </Badge>
          </Card>
          <Card className="p-4 border-border/70 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gold/15 text-gold flex items-center justify-center">
              <Home className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Imóveis em destaque
              </div>
              <div className="text-sm font-medium truncate">
                {cfg.featuredIds.length} selecionados
              </div>
            </div>
            <Badge variant="outline" className="ml-auto text-[10px]">
              máx. 6
            </Badge>
          </Card>
          <Card className="p-4 border-border/70 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-navy/10 text-navy flex items-center justify-center">
              <Link2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Link
              </div>
              <div className="text-sm font-mono truncate">
                {profile?.slug ? fullUrl : "Configure seu perfil para gerar o link"}
              </div>
            </div>
          </Card>
        </div>

        {/* Editor + Preview */}
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6">
          {/* Editor */}
          <Card className="border-border/70 p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-secondary/40 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold leading-tight">
                  Editor de perfil
                </h3>
                <p className="text-xs text-muted-foreground">
                  Auto-salvo · sincronizado com o link público
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-10 touch-manipulation rounded-full text-xs"
                onClick={openPublic}
              >
                <Eye className="h-3.5 w-3.5 mr-1" /> Abrir link público
              </Button>
            </div>

            <Tabs defaultValue="profile" className="p-6">
              <TabsList className="grid grid-cols-6 w-full bg-secondary">
                <TabsTrigger value="profile" className="gap-1.5">
                  <User className="h-3.5 w-3.5" /> Perfil
                </TabsTrigger>
                <TabsTrigger value="appearance" className="gap-1.5">
                  <Palette className="h-3.5 w-3.5" /> Visual
                </TabsTrigger>
                <TabsTrigger value="quiz" className="gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5" /> Quiz
                </TabsTrigger>
                <TabsTrigger value="videos" className="gap-1.5">
                  <VideoIcon className="h-3.5 w-3.5" /> Vídeos
                </TabsTrigger>
                <TabsTrigger value="featured" className="gap-1.5">
                  <Home className="h-3.5 w-3.5" /> Imóveis
                </TabsTrigger>
                <TabsTrigger value="links" className="gap-1.5">
                  <Link2 className="h-3.5 w-3.5" /> Links
                </TabsTrigger>
              </TabsList>

              {/* Perfil */}
              <TabsContent value="profile" className="space-y-6 mt-6">
                <Section icon={<User className="h-3.5 w-3.5" />} title="Identidade">
                  {/* Foto upload */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-20 w-20 rounded-full overflow-hidden ring-2 ring-border bg-gold flex items-center justify-center text-navy font-bold text-xl">
                        {safeSrc(cfg.photoUrl) ? (
                          <img
                            src={safeSrc(cfg.photoUrl)}
                            alt={cfg.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          cfg.name
                            .split(" ")
                            .map((p: string) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                        )}
                      </div>
                      {cfg.photoUrl && (
                        <button
                          onClick={() => update("photoUrl", "")}
                          className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lift"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Foto de perfil</Label>
                      <div className="flex items-center gap-2">
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => photoInputRef.current?.click()}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1.5" /> Enviar foto
                        </Button>
                        <span className="text-[11px] text-muted-foreground">
                          JPG ou PNG · até 4 MB
                        </span>
                      </div>
                    </div>
                  </div>

                  <Field label="Nome completo" required>
                    <Input value={cfg.name} onChange={(e) => update("name", e.target.value)} />
                  </Field>
                  <Field label="Especialidade (subtítulo)" hint="Aparece abaixo do nome">
                    <Input
                      value={cfg.subtitle}
                      onChange={(e) => update("subtitle", e.target.value)}
                    />
                  </Field>
                  <Field label="Apresentação (bio)" required>
                    <Textarea
                      rows={3}
                      value={cfg.bio}
                      onChange={(e) => update("bio", e.target.value)}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cidade" required>
                      <Input value={cfg.city} onChange={(e) => update("city", e.target.value)} />
                    </Field>
                    <Field label="WhatsApp" required>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        value={maskPhoneBR(cfg.whatsapp)}
                        onChange={(e) => update("whatsapp", onlyDigits(e.target.value))}
                      />
                    </Field>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        Selo verificado <BadgeCheck className="h-4 w-4 text-emerald" />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Exibe um badge de corretor verificado
                      </div>
                    </div>
                    <Switch checked={cfg.verified} onCheckedChange={(v) => update("verified", v)} />
                  </div>
                </Section>

                <Section icon={<Link2 className="h-3.5 w-3.5" />} title="URL da página">
                  <Field
                    label="Endereço personalizado"
                    required
                    hint="Letras minúsculas, números e hífens"
                  >
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 pl-3">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        leadlink.com.br/
                      </span>
                      <Input
                        value={cfg.slug}
                        onChange={(e) =>
                          update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                        }
                        className="border-0 bg-transparent focus-visible:ring-0 px-1 font-mono"
                      />
                    </div>
                  </Field>
                </Section>

                <Section icon={<MessageCircle className="h-3.5 w-3.5" />} title="Botão principal">
                  <Field label="Texto do botão CTA" hint="Ao clicar, abre o quiz inteligente.">
                    <Input
                      value={cfg.ctaText}
                      onChange={(e) => update("ctaText", e.target.value)}
                    />
                  </Field>
                </Section>

                <Section
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  title="Prova social"
                  subtitle="Até 3 estatísticas"
                >
                  <div className="space-y-2">
                    {cfg.stats.map((s) => (
                      <div key={s.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <Input
                          value={s.value}
                          onChange={(e) => updateStat(s.id, "value", e.target.value)}
                          placeholder="240+"
                        />
                        <Input
                          value={s.label}
                          onChange={(e) => updateStat(s.id, "label", e.target.value)}
                          placeholder="Clientes"
                        />
                        <Button size="icon" variant="ghost" onClick={() => removeStat(s.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                    {cfg.stats.length < 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-lg border-dashed"
                        onClick={addStat}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar estatística
                      </Button>
                    )}
                  </div>
                </Section>

                <Section
                  icon={<Home className="h-3.5 w-3.5" />}
                  title="Vitrine pública"
                  subtitle="Capa e cor principal usadas na vitrine de imóveis"
                >
                  <div className="rounded-xl border border-border p-4 space-y-4">
                    {safeSrc(cfg.vitrine?.coverUrl) ? (
                      <div className="relative h-36 overflow-hidden rounded-lg border border-border bg-secondary">
                        <img
                          src={safeSrc(cfg.vitrine?.coverUrl)}
                          alt="Capa da vitrine"
                          className="h-full w-full object-cover"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2 h-7 w-7 rounded-full"
                          onClick={() =>
                            update("vitrine", {
                              ...(cfg.vitrine ?? { coverUrl: "", accentColor: "navy" }),
                              coverUrl: "",
                            })
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="h-28 rounded-lg border border-dashed border-border bg-secondary/50 grid place-items-center text-xs text-muted-foreground">
                        Nenhuma capa enviada
                      </div>
                    )}
                    <input
                      ref={vitrineCoverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleVitrineCoverUpload(e.target.files?.[0])}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => vitrineCoverInputRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        {cfg.vitrine?.coverUrl ? "Trocar capa" : "Enviar capa"}
                      </Button>
                      {(["navy", "emerald", "gold", "rose", "violet", "slate"] as const).map(
                        (color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() =>
                              update("vitrine", {
                                ...(cfg.vitrine ?? { coverUrl: "", accentColor: "navy" }),
                                accentColor: color,
                              })
                            }
                            className={`h-8 rounded-full border px-3 text-xs capitalize ${
                              (cfg.vitrine?.accentColor ?? "navy") === color
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-card"
                            }`}
                          >
                            {color}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </Section>
              </TabsContent>

              {/* Aparência */}
              <TabsContent value="appearance" className="space-y-6 mt-6">
                <Section
                  icon={<Palette className="h-3.5 w-3.5" />}
                  title="Cor de destaque"
                  subtitle="Acentua botões, ícones e selos"
                >
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {(Object.keys(ACCENT_TOKENS) as Accent[]).map((c) => {
                      const t = ACCENT_TOKENS[c];
                      const active = cfg.accent === c;
                      return (
                        <button
                          key={c}
                          onClick={() => update("accent", c)}
                          className={`rounded-xl border-2 p-2 text-[10px] font-medium transition-all ${active ? "border-foreground" : "border-border hover:border-foreground/40"}`}
                          title={t.label}
                        >
                          <div
                            className="h-8 rounded-md mb-1.5"
                            style={{
                              background: t.bg,
                              boxShadow: active ? `0 0 0 3px ${t.ring}` : undefined,
                            }}
                          />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </Section>

                <Section
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  title="Estilo de fundo"
                  subtitle="Pré-visualizações ao vivo"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(BG_PRESETS) as Exclude<BgStyle, "image">[]).map((id) => {
                      const p = BG_PRESETS[id];
                      const active = cfg.bgStyle === id;
                      return (
                        <button
                          key={id}
                          onClick={() => update("bgStyle", id)}
                          className={`rounded-xl border-2 p-2 text-[11px] font-medium transition-all ${active ? "border-foreground" : "border-border hover:border-foreground/40"}`}
                        >
                          <div
                            className="h-12 rounded-md mb-1.5"
                            style={{ background: p.preview }}
                          />
                          {p.label}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => update("bgStyle", "image")}
                      className={`rounded-xl border-2 p-2 text-[11px] font-medium transition-all ${cfg.bgStyle === "image" ? "border-foreground" : "border-border hover:border-foreground/40"}`}
                    >
                      <div className="h-12 rounded-md mb-1.5 bg-foreground flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-white/70" />
                      </div>
                      Imagem
                    </button>
                  </div>
                </Section>

                <Section icon={<Type className="h-3.5 w-3.5" />} title="Tipografia">
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(FONT_FAMILIES) as FontStyle[]).map((f) => {
                      const ff = FONT_FAMILIES[f];
                      const active = cfg.font === f;
                      return (
                        <button
                          key={f}
                          onClick={() => update("font", f)}
                          className={`rounded-xl border-2 p-3 text-xs transition-all text-left ${active ? "border-foreground" : "border-border hover:border-foreground/40"}`}
                        >
                          <div
                            className="text-lg font-semibold leading-none mb-1"
                            style={{ fontFamily: ff.family }}
                          >
                            Aa
                          </div>
                          <div className="text-[10px] text-muted-foreground">{ff.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </Section>

                <Section icon={<Square className="h-3.5 w-3.5" />} title="Formato dos botões">
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(BTN_RADIUS) as BtnShape[]).map((b) => {
                      const active = cfg.btnShape === b;
                      return (
                        <button
                          key={b}
                          onClick={() => update("btnShape", b)}
                          className={`rounded-xl border-2 p-2 text-xs font-medium transition-all ${active ? "border-foreground" : "border-border hover:border-foreground/40"}`}
                        >
                          <div
                            className="h-7 mb-1.5 bg-foreground/80"
                            style={{ borderRadius: BTN_RADIUS[b] }}
                          />
                          {b === "pill" ? "Pílula" : b === "rounded" ? "Arredondado" : "Quadrado"}
                        </button>
                      );
                    })}
                  </div>
                </Section>

                <Section
                  icon={<ImageIcon className="h-3.5 w-3.5" />}
                  title="Imagem de fundo personalizada"
                  subtitle="Recebe overlay escuro premium automaticamente"
                >
                  <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
                    {cfg.bgImage ? (
                      <div className="relative rounded-lg overflow-hidden h-40 group">
                        {safeSrc(cfg.bgImage) ? (
                          <img
                            src={safeSrc(cfg.bgImage)}
                            alt="bg"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : null}
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(180deg, rgba(15,27,45,0.55) 0%, rgba(15,27,45,0.92) 100%)",
                          }}
                        />
                        <div className="absolute inset-0 flex items-end p-3 text-white text-[11px] tracking-wider uppercase">
                          Pré-visualização do overlay
                        </div>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2 h-7 w-7 rounded-full"
                          onClick={() => {
                            setHasRemoteConfig(true);
                            setCfg((c) => ({ ...c, bgImage: "" }));
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="h-32 rounded-lg bg-secondary flex flex-col items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-6 w-6 mb-1.5 opacity-60" />
                        <div className="text-xs">Nenhuma imagem enviada</div>
                      </div>
                    )}
                    <input
                      ref={bgInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleBgUpload(e.target.files?.[0])}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => bgInputRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        {cfg.bgImage ? "Trocar imagem" : "Enviar imagem"}
                      </Button>
                      <span className="text-[11px] text-muted-foreground">
                        Recomendado 1080×1920 · até 6 MB
                      </span>
                    </div>
                  </div>
                </Section>
              </TabsContent>

              {/* Vídeos */}
              <TabsContent value="videos" className="space-y-4 mt-6">
                <div className="rounded-xl border border-border bg-secondary/40 p-4 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald/10 text-emerald flex items-center justify-center shrink-0">
                    <VideoIcon className="h-4 w-4" />
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    Adicione blocos de vídeo (YouTube ou Vimeo). Cole a URL completa — o player
                    aparece direto na sua página.
                    <span className="block mt-1 text-emerald font-medium">
                      {(cfg.videos ?? []).length} / 6 blocos
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {(cfg.videos ?? []).map((v) => (
                    <div key={v.id} className="rounded-xl border border-border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={v.title}
                          onChange={(e) => updateVideo(v.id, { title: e.target.value })}
                          placeholder="Título (opcional)"
                          className="font-medium"
                        />
                        <Switch
                          checked={v.enabled}
                          onCheckedChange={(b) => updateVideo(v.id, { enabled: b })}
                        />
                        <Button size="icon" variant="ghost" onClick={() => removeVideo(v.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                      <Input
                        value={v.url}
                        onChange={(e) => updateVideo(v.id, { url: e.target.value })}
                        placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                        className="font-mono text-xs"
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full rounded-lg border-dashed"
                    onClick={addVideo}
                    disabled={(cfg.videos?.length ?? 0) >= 6}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar vídeo
                  </Button>
                </div>
              </TabsContent>

              {/* Quiz */}
              <TabsContent value="quiz" className="space-y-6 mt-6">
                <div className="rounded-xl border border-border bg-secondary/40 p-4 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald/10 text-emerald flex items-center justify-center shrink-0">
                    <HelpCircle className="h-4 w-4" />
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <div className="font-medium text-foreground mb-1">Perguntas essenciais</div>
                    Nome, Cidade e Telefone são coletados em todos os quizzes e não podem ser
                    desativados.
                  </div>
                </div>
                <Field label="Texto de boas-vindas do quiz" hint="Aparece antes das perguntas">
                  <Textarea
                    rows={2}
                    value={cfg.quizIntro}
                    onChange={(e) => update("quizIntro", e.target.value)}
                  />
                </Field>

                <div className="rounded-xl border border-border bg-card p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Blocos do quiz</div>
                      <div className="text-[11px] text-muted-foreground">
                        Selecione um tipo para editar apenas aquele bloco.
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{enabledBlockCount}</span> / 3
                      ativos
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["locacao", "compra", "investimento"] as QuizIntent[]).map((intent) => {
                      const active = activeQuizIntent === intent;
                      const block = quizBlocks[intent];
                      const label =
                        intent === "locacao"
                          ? "Locação"
                          : intent === "compra"
                            ? "Compra"
                            : "Investimento";
                      return (
                        <button
                          key={intent}
                          onClick={() => setActiveQuizIntent(intent)}
                          className={`rounded-xl border-2 px-3 py-3 text-left transition-all ${active ? "border-foreground bg-secondary" : "border-border hover:border-foreground/40"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">{label}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full ${block.enabled ? "bg-emerald/10 text-emerald" : "bg-muted text-muted-foreground"}`}
                            >
                              {block.enabled ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Ative ou desative o bloco selecionado abaixo.
                    </div>
                    <Switch
                      checked={quizBlocks[activeQuizIntent].enabled}
                      onCheckedChange={(v) => toggleBlock(activeQuizIntent, v)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {activeQuizIntent === "locacao" && selectedQuizBlock}
                  {activeQuizIntent === "compra" && selectedQuizBlock}
                  {activeQuizIntent === "investimento" && selectedQuizBlock}
                </div>
              </TabsContent>

              {/* Imóveis em destaque */}
              <TabsContent value="featured" className="space-y-4 mt-6">
                <div className="rounded-xl border border-border bg-secondary/40 p-4 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gold/15 text-gold flex items-center justify-center shrink-0">
                    <Home className="h-4 w-4" />
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    Selecione os imóveis exibidos no botão{" "}
                    <strong className="text-foreground">Imóveis em destaque</strong>.{" "}
                    <span className="text-emerald font-medium">
                      {cfg.featuredIds.length} selecionados
                    </span>{" "}
                    · máx. 6.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableProps.length === 0 && (
                    <p className="col-span-2 text-sm text-muted-foreground text-center py-4">
                      Nenhum imóvel cadastrado ainda. Adicione imóveis em <strong>Imóveis</strong>{" "}
                      para destacar aqui.
                    </p>
                  )}
                  {availableProps.map((p: AvailableProperty) => {
                    const isSelected = cfg.featuredIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleFeatured(p.id)}
                        className={`text-left rounded-xl border-2 overflow-hidden transition-all group ${isSelected ? "border-emerald shadow-lift" : "border-border hover:border-foreground/30"}`}
                      >
                        <div className="relative h-28 overflow-hidden bg-muted">
                          {safeSrc(p.image) ? (
                            <img
                              src={safeSrc(p.image)}
                              alt={p.title}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="h-full w-full bg-muted grid place-items-center text-muted-foreground text-[10px] uppercase tracking-wider">
                              SEM IMAGEM
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-emerald text-emerald-foreground flex items-center justify-center shadow-lift">
                              <Check className="h-4 w-4" />
                            </div>
                          )}
                          <Badge className="absolute bottom-2 left-2 bg-background/90 text-foreground text-[10px]">
                            {p.code}
                          </Badge>
                        </div>
                        <div className="p-3">
                          <div className="text-sm font-medium leading-tight line-clamp-1">
                            {p.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {p.neighborhood}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="font-display text-sm font-semibold">
                              R$ {(p.price / 1000).toLocaleString("pt-BR")}k
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {p.bedrooms}q · {p.area}m²
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Links */}
              <TabsContent value="links" className="space-y-3 mt-6">
                {cfg.links.map((l) => (
                  <div key={l.id} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={l.label}
                        onChange={(e) => updateLink(l.id, "label", e.target.value)}
                        placeholder="Nome do link"
                        className="font-medium"
                      />
                      <Switch
                        checked={l.enabled}
                        onCheckedChange={(v) => updateLink(l.id, "enabled", v)}
                      />
                      <Button size="icon" variant="ghost" onClick={() => removeLink(l.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    <Input
                      value={l.url}
                      onChange={(e) => updateLink(l.id, "url", e.target.value)}
                      placeholder="https://..."
                      className="font-mono text-xs"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full rounded-lg border-dashed"
                  onClick={addLink}
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar link
                </Button>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Preview ao vivo */}
          <div className="space-y-3 lg:sticky lg:top-4 self-start">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Preview ao vivo · auto-salvo
              </div>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="min-h-10 touch-manipulation text-xs rounded-full"
                  onClick={copyPublicLink}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copiar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="min-h-10 touch-manipulation text-xs rounded-full"
                  onClick={openPublic}
                >
                  <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                </Button>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="mx-auto w-full max-w-[340px]">
              <div className="rounded-[2.5rem] border-[10px] border-foreground/90 bg-foreground/90 shadow-lift overflow-hidden">
                <div className="rounded-[2rem] overflow-hidden bg-card">
                  <div className="h-6 bg-foreground/95 flex items-center justify-between px-6 text-[10px] text-background/80 font-medium">
                    <span>9:41</span>
                    <span>●●●</span>
                  </div>
                  <MeuLinkPreview
                    cfg={cfg}
                    featuredProperties={availableProps.filter((p: AvailableProperty) =>
                      cfg.featuredIds.includes(p.id),
                    )}
                  />
                </div>
              </div>
              <div className="text-center text-[10px] text-muted-foreground mt-2">
                Atualiza conforme você edita · clique em{" "}
                <span className="font-semibold">Abrir</span> para ver em tela cheia
              </div>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code do Meu Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-white p-4">
              {publicLink && (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(publicLink)}`}
                  alt="QR Code do Meu Link"
                  className="mx-auto h-64 w-64"
                />
              )}
            </div>
            <Input value={publicLink} readOnly className="font-mono text-xs" />
            <Button
              className="w-full bg-navy text-navy-foreground hover:bg-navy/90"
              onClick={copyPublicLink}
            >
              <Copy className="h-4 w-4 mr-1.5" /> Copiar link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MeuLinkSkeleton() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <Skeleton className="h-3 w-36 mb-3" />
          <Skeleton className="h-10 w-56 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6">
        <Card className="p-6 border-border/70">
          <Skeleton className="h-10 w-full mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6 border-border/70">
          <Skeleton className="h-[640px] w-full rounded-[2rem]" />
        </Card>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-secondary flex items-center justify-center text-foreground/70">
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      <div className="space-y-3 pl-8">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const map = {
    saving: { text: "Salvando…", cls: "bg-muted text-muted-foreground" },
    saved: { text: "✓ Salvo", cls: "bg-emerald/10 text-emerald border border-emerald/30" },
    error: {
      text: "Erro ao salvar",
      cls: "bg-destructive/10 text-destructive border border-destructive/30",
    },
  } as const;
  const { text, cls } = map[state];
  return <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${cls}`}>{text}</span>;
}
