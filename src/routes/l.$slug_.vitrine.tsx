import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type CSSProperties } from "react";
import {
  MapPin,
  Search,
  ArrowUpRight,
  Instagram,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  BadgeCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { loadMeuLinkConfig } from "@/server-fns/meu-link";
import { getPropertiesBySlug } from "@/server-fns/properties";
import { QuizDialog } from "@/components/QuizDialog";
import type { MeuLinkConfig } from "@/lib/meu-link-store";
import { EMPTY_MEU_LINK_CONFIG } from "@/lib/meu-link-store";
import { VITRINE_COLOR_VALUES } from "@/lib/vitrine-config";
import { safeSrc } from "@/lib/media";
import {
  formatPropertyLocation,
  formatPropertyPrice,
  getPropertyDetails,
  type PropertyDisplayInput,
  propertySearchText,
  purposeBadgeLabel,
  purposePriceLabel,
  repairText,
} from "@/lib/property-display";

type PublicProperty = PropertyDisplayInput & {
  id: string;
  status?: string | null;
  image?: string | null;
  highlight?: string | null;
  code?: string | null;
};

export const Route = createFileRoute("/l/$slug_/vitrine")({
  head: ({ params }: { params: { slug: string } }) => ({
    meta: [
      { title: `Vitrine de imóveis — ${params.slug} · LeadLink` },
      { name: "description", content: "Portfólio premium de imóveis selecionados pelo corretor." },
    ],
  }),
  loader: async ({ params }: { params: { slug: string } }) => {
    const raw = await loadMeuLinkConfig({ data: params.slug });
    const cfg: MeuLinkConfig = raw
      ? { ...EMPTY_MEU_LINK_CONFIG, ...(raw as Partial<MeuLinkConfig>) }
      : { ...EMPTY_MEU_LINK_CONFIG, slug: params.slug };
    const props = await getPropertiesBySlug({ data: params.slug });
    return { cfg, props };
  },
  component: VitrinePage,
});

function prettyName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getInstagramUrl(links: { enabled: boolean; url: string }[]) {
  return links.find((l) => l.enabled && /instagram\.com/i.test(l.url))?.url ?? null;
}

const TYPES = ["Todos", "Apartamento", "Cobertura", "Casa", "Studio", "Comercial"] as const;

function VitrinePage() {
  const { slug } = Route.useParams();
  const { cfg, props } = Route.useLoaderData() as {
    cfg: MeuLinkConfig;
    props: PublicProperty[];
  };
  const { data: liveProps = props } = useQuery({
    queryKey: ["public-vitrine", slug, "properties"],
    queryFn: () => getPropertiesBySlug({ data: slug }),
    initialData: props,
    staleTime: 90_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
  const corretor = cfg.name || prettyName(slug);
  const firstName = corretor.split(" ")[0];
  const initials = getInitials(corretor);
  const instagramUrl = getInstagramUrl(cfg.links);
  const instagramHandle = instagramUrl
    ? instagramUrl.replace(/.*instagram\.com\//, "").replace(/\/$/, "")
    : slug;
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("Todos");
  const [captureOpen, setCaptureOpen] = useState(false);

  const list = useMemo(
    () =>
      liveProps
        .filter((p) => repairText(p.status) === "Disponível")
        .filter((p) => (type === "Todos" ? true : p.type === type))
        .filter((p) => (q.trim() === "" ? true : propertySearchText(p).includes(q.toLowerCase()))),
    [liveProps, q, type],
  );

  const featured = useMemo(() => {
    const byId = new Map(liveProps.map((p) => [p.id, p]));
    const manual = (cfg.featuredIds || [])
      .map((id) => byId.get(id))
      .filter((item): item is PublicProperty => Boolean(item));
    if (manual.length > 0) return manual;
    const highlighted = props.filter((p) => p.highlight && repairText(p.status) === "Disponível");
    if (highlighted.length > 0) return highlighted.slice(0, 3);
    return props.filter((p) => repairText(p.status) === "Disponível").slice(0, 3);
  }, [cfg.featuredIds, liveProps]);

  const cityRegion = cfg.city || props[0]?.city || "sua região";
  const heroImage =
    safeSrc(cfg.vitrine?.coverUrl) || safeSrc(featured[0]?.image) || safeSrc(props[0]?.image);
  const accentColor =
    VITRINE_COLOR_VALUES[cfg.vitrine?.accentColor || "navy"] ?? VITRINE_COLOR_VALUES.navy;
  const brokerPhone = cfg.whatsapp ? cfg.whatsapp.replace(/\D/g, "") : "";
  const whatsappHref = brokerPhone ? `https://wa.me/${brokerPhone}` : undefined;

  return (
    <div
      className="min-h-screen bg-cream text-foreground antialiased"
      style={{ "--vitrine-accent": accentColor } as CSSProperties}
    >
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-cream/75 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/l/$slug" params={{ slug }} className="flex items-center gap-3 group min-w-0">
            {safeSrc(cfg.photoUrl) ? (
              <img
                src={safeSrc(cfg.photoUrl)}
                alt={corretor}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-gold/40"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-navy text-gold grid place-items-center font-display font-semibold ring-2 ring-gold/30">
                {initials}
              </div>
            )}
            <div className="leading-tight min-w-0">
              <div className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground">
                Vitrine de imóveis
              </div>
              <div className="font-display font-semibold text-sm truncate flex items-center gap-1">
                {corretor}
                {cfg.verified && <BadgeCheck className="h-3.5 w-3.5 text-gold shrink-0" />}
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setCaptureOpen(true)}
            className="group inline-flex items-center gap-1.5 rounded-full text-white text-xs md:text-sm font-medium px-4 md:px-5 py-2 md:py-2.5 shadow-[0_8px_24px_-10px_color-mix(in_oklab,var(--vitrine-accent)_70%,transparent)] hover:shadow-[0_10px_30px_-8px_color-mix(in_oklab,var(--vitrine-accent)_80%,transparent)] hover:-translate-y-px transition-all"
            style={{ background: "var(--vitrine-accent)" }}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Falar com {firstName}</span>
            <span className="sm:hidden">Falar agora</span>
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border/50 isolate bg-navy">
        <div className="absolute inset-0 pointer-events-none">
          {heroImage && (
            <img
              src={heroImage}
              alt=""
              aria-hidden
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width={1600}
              height={900}
              className="absolute inset-0 w-full h-full object-cover scale-110"
              style={{ filter: "blur(2px) saturate(1.05)" }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-navy/85 via-navy/80 to-navy/95" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_color-mix(in_oklab,var(--gold)_28%,transparent)_0%,transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_color-mix(in_oklab,var(--vitrine-accent)_22%,transparent)_0%,transparent_50%)]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-28 grid lg:grid-cols-[1.15fr_.85fr] gap-12 items-center">
          <div className="space-y-6 text-white">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-gold font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              Portfólio exclusivo
            </div>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.02]">
              Encontre seu próximo imóvel em <span className="italic text-gold">{cityRegion}</span>.
            </h1>
            <p className="text-base md:text-lg text-white/75 max-w-xl leading-relaxed">
              {cfg.bio ||
                `Atendimento direto com ${firstName}, especialista imobiliário. Cada imóvel é visitado, fotografado e negociado pessoalmente — sem intermediários.`}
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] backdrop-blur-md px-3.5 py-1.5 text-xs text-white/90">
                <ShieldCheck className="h-3.5 w-3.5 text-gold" /> Imóveis verificados
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] backdrop-blur-md px-3.5 py-1.5 text-xs text-white/90">
                <Phone className="h-3.5 w-3.5 text-gold" /> Atendimento direto
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] backdrop-blur-md px-3.5 py-1.5 text-xs text-white/90">
                <MapPin className="h-3.5 w-3.5 text-gold" /> {cityRegion}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCaptureOpen(true)}
                className="group inline-flex items-center gap-2 rounded-full text-white text-sm font-medium px-6 py-3 shadow-[0_14px_36px_-12px_color-mix(in_oklab,var(--vitrine-accent)_80%,transparent)] hover:shadow-[0_18px_44px_-10px_color-mix(in_oklab,var(--vitrine-accent)_90%,transparent)] hover:-translate-y-0.5 transition-all"
                style={{ background: "var(--vitrine-accent)" }}
              >
                <MessageCircle className="h-4 w-4" />
                Falar pelo WhatsApp
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <a
                href="#vitrine"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.04] backdrop-blur-md text-white text-sm font-medium px-6 py-3 hover:bg-white/[0.08] transition"
              >
                Ver {list.length} imóveis disponíveis
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-[2rem] border border-white/15 bg-white/[0.06] backdrop-blur-xl p-6 md:p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-4">
                {safeSrc(cfg.photoUrl) ? (
                  <img
                    src={safeSrc(cfg.photoUrl)}
                    alt={corretor}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-gold/50"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gold text-navy grid place-items-center font-display font-bold text-xl ring-2 ring-gold/40">
                    {initials}
                  </div>
                )}
                <div className="text-white">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-gold">
                    Seu corretor
                  </div>
                  <div className="font-display text-xl font-semibold leading-tight flex items-center gap-1.5">
                    {corretor}
                    {cfg.verified && <BadgeCheck className="h-4 w-4 text-gold" />}
                  </div>
                  <div className="text-xs text-white/65 mt-0.5">
                    {cfg.subtitle || "CRECI 12.345"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-white/10">
                <div>
                  <div className="font-display text-2xl font-semibold text-white">
                    {list.length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/55 mt-0.5">
                    Disponíveis
                  </div>
                </div>
                <div>
                  <div className="font-display text-2xl font-semibold text-white">
                    {featured.length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/55 mt-0.5">
                    Em destaque
                  </div>
                </div>
                <div>
                  <div className="font-display text-2xl font-semibold text-white">24h</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/55 mt-0.5">
                    Resposta
                  </div>
                </div>
              </div>

              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-1.5 text-xs text-white/75 hover:text-white transition"
                >
                  <Instagram className="h-3.5 w-3.5" /> @{instagramHandle}
                </a>
              )}
            </div>

            <div className="hidden md:flex absolute -bottom-8 -right-4 lg:-right-10 gap-2 -rotate-3">
              {featured.slice(0, 2).map((p) => (
                <div
                  key={p.id}
                  className="w-28 h-36 rounded-2xl overflow-hidden ring-2 ring-white/20 shadow-2xl"
                >
                  {safeSrc(p.image) ? (
                    <img
                      src={safeSrc(p.image)}
                      alt={repairText(p.title)}
                      loading="lazy"
                      decoding="async"
                      width={112}
                      height={144}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/10 grid place-items-center text-white/70 text-[10px] uppercase tracking-wider">
                      SEM IMAGEM
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="vitrine"
        className="sticky top-16 z-30 backdrop-blur-xl bg-cream/85 border-b border-border/50"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por bairro, código, título…"
              className="pl-11 h-11 rounded-full bg-card border-border/70 focus-visible:ring-navy/30"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 -mx-1 md:mx-0 overflow-x-auto md:overflow-visible">
            {TYPES.map((t) => {
              const active = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`shrink-0 text-xs font-medium px-4 py-2 rounded-full border transition-all ${
                    active
                      ? "text-white border-transparent shadow-[0_6px_18px_-8px_color-mix(in_oklab,var(--vitrine-accent)_70%,transparent)]"
                      : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                  style={active ? { background: "var(--vitrine-accent)" } : undefined}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Catálogo
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold mt-1">
              {list.length} {list.length === 1 ? "imóvel disponível" : "imóveis disponíveis"}
            </h2>
          </div>
          <div className="hidden md:block text-xs text-muted-foreground">Atualizado hoje</div>
        </div>

        {list.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 py-24 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-secondary grid place-items-center mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-display text-lg font-semibold">Nada encontrado por aqui</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
              Ajuste a busca ou os filtros para ver outras opções do portfólio de {firstName}.
            </p>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setType("Todos");
              }}
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-navy hover:text-navy/80 transition"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
            {list.map((p) => {
              const location = formatPropertyLocation(p);
              const details = getPropertyDetails(p).slice(0, 4);
              const purpose = purposeBadgeLabel(p.businessType);

              return (
                <Link
                  key={p.id}
                  to="/l/$slug/vitrine/$propertyId"
                  params={{ slug, propertyId: p.id }}
                  className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 rounded-3xl"
                >
                  <article className="relative rounded-3xl overflow-hidden bg-card border border-border/60 shadow-[0_2px_10px_-4px_rgba(15,27,45,0.08)] hover:shadow-[0_24px_48px_-20px_rgba(15,27,45,0.28)] hover:-translate-y-1 hover:border-navy/30 transition-all duration-300">
                    <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                      {safeSrc(p.image) ? (
                        <img
                          src={safeSrc(p.image)}
                          alt={repairText(p.title)}
                          loading="lazy"
                          fetchPriority="low"
                          decoding="async"
                          width={800}
                          height={1000}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center bg-secondary text-muted-foreground text-[10px] uppercase tracking-wider">
                          SEM IMAGEM
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/15 to-transparent" />

                      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {p.type && (
                            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold/95 text-navy backdrop-blur-md">
                              {repairText(p.type)}
                            </span>
                          )}
                          {purpose && (
                            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/15 text-white border border-white/20 backdrop-blur-md">
                              {purpose}
                            </span>
                          )}
                          {p.highlight && (
                            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/15 text-white border border-white/20 backdrop-blur-md">
                              {repairText(p.highlight)}
                            </span>
                          )}
                        </div>
                        {p.code && (
                          <span className="text-[10px] font-mono text-white/85 bg-black/25 backdrop-blur-md px-2 py-1 rounded-full">
                            {p.code}
                          </span>
                        )}
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                        {location && (
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/75 flex items-center gap-1 mb-1">
                            <MapPin className="h-3 w-3" /> {location}
                          </div>
                        )}
                        <div className="font-display text-xl md:text-[1.35rem] font-semibold leading-tight line-clamp-1 group-hover:text-gold transition-colors">
                          {repairText(p.title)}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            {purposePriceLabel(p.businessType)}
                          </div>
                          <div className="font-display text-2xl font-semibold text-navy leading-tight">
                            {formatPropertyPrice(p.price)}
                          </div>
                        </div>
                        <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-secondary text-navy group-hover:bg-navy group-hover:text-navy-foreground transition-colors">
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </div>

                      {details.length > 0 && (
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground border-t border-border/60 pt-3.5">
                          {details.map((detail) => {
                            const Icon = detail.icon;
                            return (
                              <span key={detail.key} className="flex items-center gap-1.5">
                                <Icon className="h-3.5 w-3.5" />
                                <span className="text-foreground font-medium">{detail.value}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="relative overflow-hidden border-y border-border/60 bg-navy text-navy-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_color-mix(in_oklab,var(--gold)_22%,transparent)_0%,transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-20 grid md:grid-cols-[1.2fr_.8fr] gap-8 items-center">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-gold font-semibold mb-3">
              Não encontrou o ideal?
            </div>
            <h3 className="font-display text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              Conte para {firstName} o que você procura.
            </h3>
            <p className="text-navy-foreground/75 mt-4 max-w-lg">
              Atendimento personalizado, busca ativa de imóveis fora do portfólio público e visitas
              agendadas no seu tempo.
            </p>
          </div>
          <div className="flex md:justify-end">
            <button
              type="button"
              onClick={() => setCaptureOpen(true)}
              className="group inline-flex items-center gap-2 rounded-full text-white text-sm font-medium px-7 py-4 shadow-[0_18px_44px_-12px_color-mix(in_oklab,var(--vitrine-accent)_80%,transparent)] hover:shadow-[0_22px_54px_-10px_color-mix(in_oklab,var(--vitrine-accent)_90%,transparent)] hover:-translate-y-0.5 transition-all"
              style={{ background: "var(--vitrine-accent)" }}
            >
              <MessageCircle className="h-4 w-4" />
              Falar pelo WhatsApp agora
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-cream">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="text-muted-foreground text-center md:text-left">
            © {new Date().getFullYear()} {corretor}
          </div>
          <Link
            to="/"
            className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground hover:text-foreground transition"
          >
            Powered by <span className="font-semibold text-foreground">LeadLink</span>
          </Link>
        </div>
      </footer>

      <div className="md:hidden fixed bottom-4 inset-x-4 z-40">
        <button
          type="button"
          onClick={() => setCaptureOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full text-white text-sm font-semibold py-3.5 shadow-[0_14px_36px_-10px_color-mix(in_oklab,var(--vitrine-accent)_80%,transparent)]"
          style={{ background: "var(--vitrine-accent)" }}
        >
          <MessageCircle className="h-4 w-4" />
          Falar pelo WhatsApp
        </button>
      </div>

      <QuizDialog
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        cfg={cfg}
        slug={slug}
        originPath="vitrine"
      />
    </div>
  );
}
