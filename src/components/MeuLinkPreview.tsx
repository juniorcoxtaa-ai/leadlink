import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BadgeCheck, MapPin, MessageCircle, Share2, Play, ArrowUpRight } from "lucide-react";
import {
  ACCENT_TOKENS,
  BG_PRESETS,
  BTN_RADIUS,
  FONT_FAMILIES,
  toVideoEmbed,
  type MeuLinkConfig,
} from "@/lib/meu-link-store";
import { safeSrc } from "@/lib/media";
import {
  formatPropertyLocation,
  formatPropertyPrice,
  purposeBadgeLabel,
  repairText,
} from "@/lib/property-display";
import { QuizDialog } from "./QuizDialog";

type FeaturedProp = {
  id: string;
  title: string;
  businessType?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  state?: string | null;
  price: number;
  image?: string | null;
};

type Props = {
  cfg: MeuLinkConfig;
  fullScreen?: boolean;
  featuredProperties?: FeaturedProp[];
};

export function MeuLinkPreview({ cfg, fullScreen, featuredProperties = [] }: Props) {
  const [quizOpen, setQuizOpen] = useState(false);
  const resolvedSlug = cfg.slug.trim();

  const initials = cfg.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const featuredProps = featuredProperties;
  const videos = (cfg.videos || []).filter((v) => v.enabled && v.url);

  const accent = ACCENT_TOKENS[cfg.accent];
  const radius = BTN_RADIUS[cfg.btnShape];
  const fontFamily = FONT_FAMILIES[cfg.font].family;

  const bgImageSrc = safeSrc(cfg.bgImage);
  const hasBgImage = Boolean(bgImageSrc);
  const preset = cfg.bgStyle !== "image" ? BG_PRESETS[cfg.bgStyle] : null;
  const isImageStyle = cfg.bgStyle === "image";
  const isDark = hasBgImage || isImageStyle || (preset?.isDark ?? false);
  const text = isDark ? "text-white" : "text-foreground";
  const surface = isDark ? "bg-white/10 backdrop-blur-sm" : "bg-card border border-border";
  const surfaceText = isDark ? "text-white" : "text-foreground";

  const bgStyle: React.CSSProperties =
    !hasBgImage && !isImageStyle
      ? { background: preset?.preview }
      : { background: preset?.preview };

  return (
    <div
      className={`relative ${fullScreen ? "min-h-screen" : "min-h-[560px]"} ${text} overflow-hidden`}
      style={{ ...bgStyle, fontFamily }}
    >
      {/* Imagem de fundo + overlays premium */}
      {hasBgImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center scale-110"
            style={{
              backgroundImage: `url(${bgImageSrc})`,
              filter: "blur(2px) saturate(1.1)",
            }}
            aria-hidden
          />
          {preset && (
            <div
              className="absolute inset-0 opacity-70 mix-blend-multiply"
              style={{ background: preset.preview }}
              aria-hidden
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(15,27,45,0.45) 0%, rgba(15,27,45,0.68) 55%, rgba(15,27,45,0.92) 100%)",
            }}
            aria-hidden
          />
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, ${accent.soft} 0%, transparent 60%)`,
            }}
            aria-hidden
          />
        </>
      )}

      {!hasBgImage && isImageStyle && (
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(15,27,45,0.72) 0%, rgba(15,27,45,0.92) 100%)",
          }}
          aria-hidden
        />
      )}

      <div
        className={`relative ${fullScreen ? "max-w-[480px] mx-auto" : ""} px-5 py-7 flex flex-col min-h-inherit`}
      >
        {/* Top bar */}
        <div className="flex justify-end mb-5 opacity-75">
          <Share2 className="h-3.5 w-3.5" />
        </div>

        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <Avatar
            className={`h-20 w-20 ring-4 ${isDark ? "ring-white/15" : "ring-white"} shadow-lift overflow-hidden`}
            style={{ boxShadow: `0 0 0 4px ${accent.soft}` }}
          >
            {safeSrc(cfg.photoUrl) ? (
              <img
                src={safeSrc(cfg.photoUrl)}
                alt={cfg.name}
                className="h-full w-full object-cover"
              />
            ) : null}
            <AvatarFallback
              className="text-2xl font-bold"
              style={{ background: accent.bg, color: accent.fg }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="mt-3 flex items-center gap-1.5">
            <h2 className="text-xl font-semibold leading-tight" style={{ fontFamily }}>
              {cfg.name}
            </h2>
            {cfg.verified && <BadgeCheck className="h-4 w-4" style={{ color: accent.bg }} />}
          </div>
          {cfg.subtitle && <div className="text-[11px] opacity-70 mt-0.5">{cfg.subtitle}</div>}

          <div className="flex items-center gap-1 text-[11px] opacity-80 mt-2">
            <MapPin className="h-3 w-3" /> {cfg.city}
          </div>

          <p className="text-xs opacity-80 mt-3 max-w-[280px] leading-relaxed">{cfg.bio}</p>

          {/* Stats */}
          {cfg.stats.length > 0 && (
            <div className="grid grid-cols-3 gap-2 w-full mt-4">
              {cfg.stats.map((s) => (
                <div
                  key={s.id}
                  className={`py-2 px-1 ${isDark ? "bg-white/10 backdrop-blur-sm" : "bg-foreground/5"}`}
                  style={{ borderRadius: radius }}
                >
                  <div className="text-base font-semibold leading-none" style={{ fontFamily }}>
                    {s.value}
                  </div>
                  <div className="text-[9px] opacity-70 mt-1 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* CTA — abre o Quiz */}
          <button
            type="button"
            onClick={() => setQuizOpen(true)}
            className="w-full mt-5 h-11 font-semibold text-sm shadow-lift inline-flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] cursor-pointer"
            style={{
              background: accent.bg,
              color: accent.fg,
              borderRadius: radius,
              boxShadow: `0 10px 28px -10px ${accent.ring}`,
            }}
          >
            <MessageCircle className="h-4 w-4" /> {cfg.ctaText}
          </button>
          {resolvedSlug ? (
            <Link
              to="/l/$slug/vitrine"
              params={{ slug: resolvedSlug }}
              className="group w-full mt-2 h-11 font-semibold text-sm inline-flex items-center justify-center gap-2 rounded-full border border-current/20 bg-white/10 backdrop-blur-sm shadow-sm hover:bg-white/15 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <span>Vitrine de Imóveis</span>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          ) : (
            <div className="w-full mt-2 h-11 font-semibold text-sm inline-flex items-center justify-center gap-2 rounded-full border border-current/20 bg-white/10 backdrop-blur-sm opacity-60 cursor-not-allowed">
              <span>Configure seu endereço personalizado primeiro</span>
            </div>
          )}

          {/* Vídeos */}
          {videos.length > 0 && (
            <div className="w-full mt-5 text-left">
              <div className="text-[10px] uppercase tracking-wider opacity-60 mb-2">Vídeos</div>
              <div className="space-y-3">
                {videos.slice(0, fullScreen ? 6 : 2).map((v) => {
                  const embed = toVideoEmbed(v.url);
                  return (
                    <div
                      key={v.id}
                      className={`${surface} ${surfaceText} overflow-hidden`}
                      style={{ borderRadius: radius }}
                    >
                      <div className="aspect-video bg-black/40 relative">
                        {embed ? (
                          <iframe
                            src={embed}
                            title={v.title}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center opacity-60">
                            <Play className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      {v.title && (
                        <div className="px-3 py-2 text-[11px] font-medium leading-tight">
                          {v.title}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Imóveis em destaque */}
          {featuredProps.length > 0 && (
            <div className="w-full mt-5 text-left">
              <div className="text-[10px] uppercase tracking-wider opacity-60 mb-2">
                Imóveis em destaque
              </div>
              <div className="space-y-2">
                {featuredProps.slice(0, fullScreen ? 6 : 3).map((p) => {
                  const purpose = purposeBadgeLabel(p.businessType);
                  const location = formatPropertyLocation(p);

                  return (
                    <Link
                      key={p.id}
                      to="/l/$slug/vitrine/$propertyId"
                      params={{ slug: resolvedSlug, propertyId: p.id }}
                      className={`flex items-center gap-2 p-1.5 ${surface} ${surfaceText} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer`}
                      style={{ borderRadius: radius }}
                    >
                      {safeSrc(p.image) ? (
                        <img
                          src={safeSrc(p.image)}
                          alt={repairText(p.title)}
                          className="h-10 w-10 object-cover shrink-0"
                          style={{ borderRadius: `calc(${radius} * 0.6)` }}
                        />
                      ) : (
                        <div
                          className="h-10 w-10 shrink-0 bg-current/10 grid place-items-center text-[9px] opacity-70"
                          style={{ borderRadius: `calc(${radius} * 0.6)` }}
                        >
                          Foto
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {purpose && (
                          <div className="mb-0.5 inline-flex rounded-full bg-current/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wider opacity-80">
                            {purpose}
                          </div>
                        )}
                        <div className="text-[10px] font-medium leading-tight line-clamp-1">
                          {repairText(p.title)}
                        </div>
                        {location && <div className="text-[9px] opacity-70">{location}</div>}
                        <div className="text-[9px] opacity-80">{formatPropertyPrice(p.price)}</div>
                      </div>
                      <span className="text-[9px] font-medium opacity-80 pr-1">Ver imóvel</span>
                    </Link>
                  );
                })}
                {!fullScreen && featuredProps.length > 3 && (
                  <div className="text-[9px] opacity-60 text-center pt-1">
                    + {featuredProps.length - 3} imóveis
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="w-full mt-3 space-y-2">
            {cfg.links
              .filter((l) => l.enabled)
              .map((l) => (
                <a
                  key={l.id}
                  href={l.url || "#"}
                  target={l.url?.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={`w-full h-10 text-xs font-medium flex items-center justify-center ${surface} ${surfaceText} hover:opacity-95 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer`}
                  style={{ borderRadius: radius }}
                >
                  {l.label}
                </a>
              ))}
          </div>

          <div className="mt-auto pt-6 text-[9px] opacity-50 tracking-wider">
            LeadLink IA · {cfg.slug}
          </div>
        </div>
      </div>

      <QuizDialog open={quizOpen} onOpenChange={setQuizOpen} cfg={cfg} slug={cfg.slug} />
    </div>
  );
}
