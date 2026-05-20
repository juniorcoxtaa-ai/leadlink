import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Sparkles,
} from "lucide-react";
import { QuizDialog } from "@/components/QuizDialog";
import { EMPTY_MEU_LINK_CONFIG, type MeuLinkConfig } from "@/lib/meu-link-store";
import { safeSrc } from "@/lib/media";
import {
  buildFeaturesList,
  buildPropertyDescription,
  formatPropertyLocation,
  formatPropertyPrice,
  getPropertyDetails,
  type PropertyDisplayInput,
  purposeBadgeLabel,
  purposePriceLabel,
  repairText,
} from "@/lib/property-display";
import { loadMeuLinkConfig } from "@/server-fns/meu-link";
import { getPropertiesBySlug, getPropertyPublic } from "@/server-fns/properties";
import { toWhatsappNumber } from "@/lib/phone";

type PublicProperty = PropertyDisplayInput & {
  id: string;
  status?: string | null;
  image?: string | null;
  images?: unknown;
  highlight?: string | null;
  code?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
};

export const Route = createFileRoute("/l/$slug_/vitrine_/$propertyId")({
  head: ({ params }: { params: { slug: string } }) => ({
    meta: [{ title: `Imóvel — ${params.slug} · LeadLink` }],
  }),
  loader: async ({ params }: { params: { slug: string; propertyId: string } }) => {
    const [property, rawCfg, props] = await Promise.all([
      getPropertyPublic({ data: { slug: params.slug, propertyId: params.propertyId } }),
      loadMeuLinkConfig({ data: params.slug }),
      getPropertiesBySlug({ data: params.slug }),
    ]);
    const cfg: MeuLinkConfig = rawCfg
      ? { ...EMPTY_MEU_LINK_CONFIG, ...(rawCfg as Partial<MeuLinkConfig>) }
      : { ...EMPTY_MEU_LINK_CONFIG, slug: params.slug };
    return { property, cfg, props };
  },
  component: PropertyDetail,
});

function prettyName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function formatMeterPrice(price?: number | null, area?: number | null) {
  const numericPrice = Number(price || 0);
  const numericArea = Number(area || 0);
  if (!numericPrice || !numericArea) return "";
  return `${formatPropertyPrice(Math.round(numericPrice / numericArea))}/m²`;
}

function PropertyDetail() {
  const { slug } = Route.useParams();
  const {
    property: p,
    cfg,
    props,
  } = Route.useLoaderData() as {
    property: PublicProperty | null;
    cfg: MeuLinkConfig;
    props: PublicProperty[];
  };
  const [quizOpen, setQuizOpen] = useState(false);
  const [active, setActive] = useState(0);

  if (!p) {
    return (
      <div className="min-h-screen bg-cream text-foreground flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-3">
          <div className="text-4xl">🏠</div>
          <h1 className="font-display text-2xl font-semibold">Imóvel indisponível</h1>
          <p className="text-sm text-muted-foreground">
            Este imóvel não está disponível no momento.
          </p>
          <Link
            to="/l/$slug/vitrine"
            params={{ slug }}
            className="inline-flex items-center justify-center rounded-full bg-navy text-navy-foreground px-4 py-2 text-sm font-medium"
          >
            Voltar para a vitrine
          </Link>
        </div>
      </div>
    );
  }

  const corretorName = cfg?.name || prettyName(slug);
  const firstName = corretorName.split(" ")[0] || "corretor";
  const initials = corretorName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const instagramUrl = cfg.links.find((l) => l.enabled && /instagram\.com/i.test(l.url))?.url;
  const gallery = [p.image, ...(Array.isArray(p.images) ? p.images : [])].filter(
    Boolean,
  ) as string[];
  const details = getPropertyDetails(p);
  const compactDetails = details.map((detail) => detail.compact).slice(0, 3);
  const features = buildFeaturesList(p.features);
  const location = formatPropertyLocation(p);
  const meterPrice = formatMeterPrice(p.price, p.area);
  const brokerPhone = toWhatsappNumber(p.whatsapp || p.phone || cfg.whatsapp || "") || "";
  const telUrl = brokerPhone ? `tel:+${brokerPhone}` : undefined;
  const relatedProperties = props
    .filter((item) => item.id !== p.id && repairText(item.status) === "Disponível")
    .slice(0, 4);
  const purpose = purposeBadgeLabel(p.businessType);

  return (
    <div className="min-h-screen bg-cream text-foreground antialiased">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-cream/85 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-3.5 flex items-center justify-between gap-3">
          <Link
            to="/l/$slug/vitrine"
            params={{ slug }}
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition group min-w-0"
          >
            <span className="h-9 w-9 rounded-full border border-border bg-card grid place-items-center text-foreground/80 group-hover:text-foreground group-hover:border-foreground/30 transition shrink-0">
              <ArrowLeft className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Vitrine do corretor
              </span>
              <span className="block truncate font-display text-sm md:text-base text-foreground">
                {corretorName}
              </span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-2 min-w-0">
            {(p.highlight || p.type) && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                {repairText(p.highlight || p.type)}
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
            )}
            {p.code && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
                {p.code}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button className="h-9 w-9 grid place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:-translate-y-0.5 transition">
              <Share2 className="h-4 w-4" />
            </button>
            <button className="h-9 w-9 grid place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-rose-500 hover:border-rose-300 hover:-translate-y-0.5 transition">
              <Heart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-5 md:mb-6">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-[0.22em]">
              {p.highlight && (
                <span className="inline-flex items-center gap-1 text-gold font-semibold">
                  <Sparkles className="h-3 w-3" /> {repairText(p.highlight)}
                </span>
              )}
              {p.type && <span className="text-muted-foreground">{repairText(p.type)}</span>}
              {purpose && <span className="text-muted-foreground">{purpose}</span>}
              {p.code && <span className="text-muted-foreground font-mono">{p.code}</span>}
            </div>
            <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.02]">
              {repairText(p.title)}
            </h1>
            {location && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {location}
              </div>
            )}
          </div>
          <div className="md:text-right shrink-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {purposePriceLabel(p.businessType)}
            </div>
            <div className="font-display text-3xl md:text-4xl font-semibold text-navy leading-none mt-1">
              {formatPropertyPrice(p.price)}
            </div>
            {meterPrice && <div className="text-xs text-muted-foreground mt-1">{meterPrice}</div>}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-3 mb-10">
          <div className="relative aspect-[4/3] lg:aspect-[16/11] rounded-3xl overflow-hidden ring-1 ring-border/60 bg-secondary group shadow-[0_24px_60px_-30px_rgba(15,27,45,0.4)]">
            {safeSrc(gallery[active]) ? (
              <img
                src={safeSrc(gallery[active])}
                alt={repairText(p.title)}
                width={1600}
                height={1200}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-secondary text-muted-foreground text-xs uppercase tracking-wider">
                Sem imagem
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-navy/40 to-transparent pointer-events-none" />

            {gallery.length > 1 && (
              <>
                <button
                  onClick={() => setActive((i) => (i - 1 + gallery.length) % gallery.length)}
                  aria-label="Anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 backdrop-blur grid place-items-center text-navy hover:bg-white shadow-lg transition opacity-0 group-hover:opacity-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setActive((i) => (i + 1) % gallery.length)}
                  aria-label="Próximo"
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 backdrop-blur grid place-items-center text-navy hover:bg-white shadow-lg transition opacity-0 group-hover:opacity-100"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {gallery.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 backdrop-blur-md rounded-full px-2.5 py-1.5">
                {gallery.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Foto ${i + 1}`}
                    onClick={() => setActive(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      active === i ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="grid gap-3">
              {gallery.slice(1, 5).map((img, i) => {
                const idx = i + 1;
                return (
                  <button
                    key={idx}
                    onClick={() => setActive(idx)}
                    className={`relative aspect-[4/3] rounded-2xl overflow-hidden ring-1 transition-all group ${
                      active === idx
                        ? "ring-2 ring-navy"
                        : "ring-border/60 hover:ring-foreground/30"
                    }`}
                  >
                    <img
                      src={safeSrc(img)}
                      alt=""
                      loading="lazy"
                      width={640}
                      height={480}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {i === 3 && gallery.length > 5 && (
                      <div className="absolute inset-0 bg-navy/70 grid place-items-center text-white">
                        <div className="text-center">
                          <div className="font-display text-2xl font-semibold">
                            +{gallery.length - 5}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider mt-0.5">
                            Ver fotos
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {details.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-12">
            {details.map((detail) => {
              const Icon = detail.icon;
              return (
                <div key={detail.key} className="rounded-2xl border border-border/70 bg-card p-5">
                  <Icon className="h-5 w-5 text-navy mb-3" />
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {detail.label}
                  </div>
                  <div className="font-display text-2xl font-semibold mt-0.5">{detail.value}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_360px] gap-10 pb-20">
          <div className="space-y-12">
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                Sobre o imóvel
              </div>
              <h2 className="font-display text-2xl font-semibold mb-4">Sobre o imóvel</h2>
              <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed space-y-3">
                <p>{buildPropertyDescription(p)}</p>
              </div>
            </section>

            {features.length > 0 && (
              <section>
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
                  Diferenciais
                </div>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                  {features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {location && (
              <section className="rounded-2xl overflow-hidden border border-border/70 bg-card">
                <div className="aspect-[16/7] bg-[linear-gradient(135deg,_color-mix(in_oklab,_var(--navy)_15%,_transparent),_color-mix(in_oklab,_var(--gold)_15%,_transparent))] grid place-items-center text-muted-foreground text-xs uppercase tracking-[0.2em]">
                  Mapa · {location}
                </div>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 h-fit space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-lift">
              <div className="bg-navy p-6 text-navy-foreground">
                <div className="flex items-center gap-3">
                  {safeSrc(cfg.photoUrl) ? (
                    <img
                      src={safeSrc(cfg.photoUrl)}
                      alt={corretorName}
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-gold/40"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-gold text-navy grid place-items-center font-display font-semibold text-lg ring-2 ring-gold/40">
                      {initials}
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-gold">
                      Seu corretor
                    </div>
                    <div className="font-display text-lg font-semibold leading-tight">
                      {corretorName}
                    </div>
                    <div className="text-xs text-navy-foreground/70">{cfg.city}</div>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setQuizOpen(true)}
                  className="group relative w-full overflow-hidden flex items-center justify-center gap-2 rounded-2xl bg-navy text-navy-foreground font-medium text-sm py-3.5 hover:opacity-90 transition"
                >
                  <MessageCircle className="h-4 w-4" /> Falar pelo WhatsApp
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>
                {telUrl && (
                  <a
                    href={telUrl}
                    className="flex items-center justify-center gap-2 w-full rounded-2xl border border-border bg-card text-foreground font-medium text-sm py-3.5 hover:border-navy/30 hover:bg-navy/5 transition"
                  >
                    <Phone className="h-4 w-4" /> Ligar agora
                  </a>
                )}
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition py-2.5 rounded-xl hover:bg-secondary/60"
                  >
                    <Instagram className="h-3.5 w-3.5" /> Instagram
                  </a>
                )}
              </div>
              <div className="border-t border-border/60 px-5 py-4 grid grid-cols-2 gap-3 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald" /> Visita acompanhada
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald" /> Documentação
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald" /> Financiamento
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald" /> Resposta em 24h
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-cream p-5 text-xs text-muted-foreground leading-relaxed">
              Atendimento exclusivo de segunda a sábado. Visitas mediante agendamento.
            </div>
          </aside>
        </div>

        {relatedProperties.length > 0 && (
          <section className="max-w-7xl mx-auto px-0 md:px-0 pb-24">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
                  Mais opções
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                  Outros imóveis de {firstName}
                </h2>
              </div>
              <Link
                to="/l/$slug/vitrine"
                params={{ slug }}
                className="hidden md:inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition"
              >
                Ver vitrine completa <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProperties.map((item) => {
                const itemDetails = getPropertyDetails(item)
                  .map((detail) => detail.compact)
                  .slice(0, 2)
                  .join(" · ");
                const itemLocation = formatPropertyLocation(item);

                return (
                  <Link
                    key={item.id}
                    to="/l/$slug/vitrine/$propertyId"
                    params={{ slug, propertyId: item.id }}
                    className="group rounded-3xl overflow-hidden border border-border/60 bg-card hover:shadow-[0_24px_48px_-20px_rgba(15,27,45,0.25)] hover:-translate-y-1 hover:border-navy/30 transition-all duration-300"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                      {safeSrc(item.image) ? (
                        <img
                          src={safeSrc(item.image)}
                          alt={repairText(item.title)}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center bg-secondary text-muted-foreground text-[10px] uppercase tracking-wider">
                          Sem imagem
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/10 to-transparent" />
                      <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider bg-gold/95 text-navy px-2.5 py-1 rounded-full font-semibold backdrop-blur">
                        {purposeBadgeLabel(item.businessType) || repairText(item.type)}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                        {itemLocation && (
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/75 flex items-center gap-1 mb-1">
                            <MapPin className="h-3 w-3" /> {itemLocation}
                          </div>
                        )}
                        <div className="font-display text-base font-semibold leading-tight line-clamp-1 group-hover:text-gold transition-colors">
                          {repairText(item.title)}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex items-end justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          {purposePriceLabel(item.businessType)}
                        </div>
                        <div className="font-display text-lg font-semibold text-navy leading-tight">
                          {formatPropertyPrice(item.price)}
                        </div>
                      </div>
                      {itemDetails && (
                        <div className="text-[11px] text-muted-foreground text-right">
                          {itemDetails}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <footer className="border-t border-border/60 bg-cream">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex items-center justify-between text-sm">
          <Link
            to="/l/$slug/vitrine"
            params={{ slug }}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Ver todos os imóveis
          </Link>
          <Link
            to="/"
            className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground hover:text-foreground transition"
          >
            Powered by <span className="font-semibold text-foreground">LeadLink</span>
          </Link>
        </div>
      </footer>

      <div className="lg:hidden fixed bottom-4 inset-x-4 z-40">
        <button
          type="button"
          onClick={() => setQuizOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-emerald text-white text-sm font-semibold py-3.5 shadow-[0_14px_36px_-10px_color-mix(in_oklab,var(--emerald)_80%,transparent)]"
        >
          <MessageCircle className="h-4 w-4" />
          Falar pelo WhatsApp
        </button>
      </div>

      <QuizDialog
        open={quizOpen}
        onOpenChange={setQuizOpen}
        cfg={cfg}
        slug={slug}
        originPath="vitrine"
        property={{
          id: p.id,
          code: p.code || "",
          title: p.title || "Imovel",
          type: p.type || undefined,
          businessType: p.businessType || undefined,
          price: p.price || undefined,
          neighborhood: p.neighborhood || "",
          city: p.city || undefined,
          whatsapp: p.whatsapp,
          phone: p.phone,
        }}
      />
    </div>
  );
}
