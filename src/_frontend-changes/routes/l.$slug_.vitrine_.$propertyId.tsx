import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Bed, Bath, Car, Maximize2, MapPin, MessageCircle, Phone, Mail,
  Check, Share2, Heart, Instagram,
} from "lucide-react";
import { properties, brokers } from "@/lib/mock-data";

export const Route = createFileRoute("/l/$slug_/vitrine_/$propertyId")({
  head: ({ params }) => ({
    meta: [{ title: `Imóvel ${params.propertyId} — ${params.slug} · LeadLink` }],
  }),
  component: PropertyDetail,
});

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function prettyName(slug: string) {
  return slug.split("-").filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

// extra gallery images (mock)
const extraImages = [
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80",
];

const FEATURES = [
  "Varanda gourmet integrada",
  "Cozinha planejada Italínea",
  "Piso porcelanato 90x90",
  "Ar-condicionado em todos os ambientes",
  "Automação Smart Home",
  "Hidro com vista panorâmica",
  "Closet master com iluminação LED",
  "Vaga dupla coberta + depósito",
];

const AMENITIES = ["Piscina aquecida", "Academia equipada", "Coworking", "Spa", "Salão gourmet", "Brinquedoteca", "Pet place", "Concierge 24h"];

function PropertyDetail() {
  const { slug, propertyId } = Route.useParams();
  const property = properties.find((p) => p.id === propertyId);
  if (!property) throw notFound();

  const broker = brokers.find((b) => b.id === property.brokerId) ?? brokers[0];
  const corretor = prettyName(slug);
  const gallery = [property.image, ...extraImages];
  const [active, setActive] = useState(0);

  // Deterministic mock phone per broker (until backend provides real one)
  const brokerPhone = (() => {
    const seed = broker.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const a = 90000 + (seed * 7919) % 9999;
    const b = 1000 + (seed * 1237) % 9000;
    return `5511${("9" + a.toString().slice(0, 4) + b).replace(/\D/g, "")}`;
  })();

  const wppMsg = encodeURIComponent(
    `Olá ${broker.name.split(" ")[0]}! Tenho interesse no imóvel ${property.code} — ${property.title} (${property.neighborhood}). Pode me passar mais informações?`,
  );
  const wppUrl = `https://wa.me/${brokerPhone}?text=${wppMsg}`;
  const telUrl = `tel:+${brokerPhone}`;

  // Outros imóveis do mesmo corretor
  const otherProperties = properties
    .filter((p) => p.brokerId === broker.id && p.id !== property.id)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-cream text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur bg-cream/85 border-b border-border/60">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link
            to="/l/$slug/vitrine"
            params={{ slug }}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Vitrine de {corretor.split(" ")[0]}
          </Link>
          <div className="flex items-center gap-2">
            <button className="h-9 w-9 grid place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition">
              <Share2 className="h-4 w-4" />
            </button>
            <button className="h-9 w-9 grid place-items-center rounded-full border border-border text-muted-foreground hover:text-rose-500 hover:border-rose-300 transition">
              <Heart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 pt-8">
        {/* Title block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-gold font-semibold">
              {property.highlight && <span>{property.highlight} ·</span>}
              <span className="text-muted-foreground">{property.type}</span>
              <span className="text-muted-foreground">· {property.code}</span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              {property.title}
            </h1>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {property.neighborhood}, {property.city}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Valor</div>
            <div className="font-display text-3xl md:text-4xl font-semibold text-emerald">{fmtBRL(property.price)}</div>
            <div className="text-xs text-muted-foreground">≈ {fmtBRL(Math.round(property.price / property.area))}/m²</div>
          </div>
        </div>

        {/* Gallery */}
        <div className="grid md:grid-cols-[1fr_280px] gap-3 mb-10">
          <div className="relative aspect-[4/3] md:aspect-[16/10] rounded-2xl overflow-hidden ring-1 ring-border/60 bg-secondary">
            <img src={gallery[active]} alt={property.title} className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-4 md:grid-cols-1 gap-3">
            {gallery.slice(0, 4).map((img, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`relative aspect-square md:aspect-[4/3] rounded-xl overflow-hidden ring-1 transition ${
                  active === i ? "ring-2 ring-navy" : "ring-border/60 hover:ring-foreground/40"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Specs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-12">
          {[
            { icon: Bed, label: "Dormitórios", value: property.bedrooms },
            { icon: Bath, label: "Banheiros", value: property.bathrooms },
            { icon: Car, label: "Vagas", value: property.parking },
            { icon: Maximize2, label: "Área útil", value: `${property.area}m²` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/70 bg-card p-5">
              <s.icon className="h-5 w-5 text-navy mb-3" />
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{s.label}</div>
              <div className="font-display text-2xl font-semibold mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-10 pb-20">
          {/* Left: content */}
          <div className="space-y-12">
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Sobre o imóvel</div>
              <h2 className="font-display text-2xl font-semibold mb-4">Um endereço para chamar de seu.</h2>
              <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed space-y-3">
                <p>
                  {property.title} é um {property.type.toLowerCase()} de {property.area}m² localizado em {property.neighborhood},
                  uma das regiões mais valorizadas de {property.city}. Projetado para receber bem,
                  cada ambiente foi pensado com acabamentos premium e luminosidade natural durante todo o dia.
                </p>
                <p>
                  São {property.bedrooms > 0 ? `${property.bedrooms} dormitórios, ` : ""}{property.bathrooms} banheiros e {property.parking} vagas
                  de garagem, em um condomínio com infraestrutura completa de lazer e conveniência. Ideal para
                  quem busca exclusividade, conforto e localização privilegiada.
                </p>
              </div>
            </section>

            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">Diferenciais</div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {FEATURES.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">Lazer & condomínio</div>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((a) => (
                  <span key={a} className="text-xs px-3 py-1.5 rounded-full bg-card border border-border text-foreground/80">
                    {a}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-2xl overflow-hidden border border-border/70 bg-card">
              <div className="aspect-[16/7] bg-[linear-gradient(135deg,_color-mix(in_oklab,_var(--navy)_15%,_transparent),_color-mix(in_oklab,_var(--gold)_15%,_transparent))] grid place-items-center text-muted-foreground text-xs uppercase tracking-[0.2em]">
                Mapa · {property.neighborhood}
              </div>
            </section>
          </div>

          {/* Right: agent card sticky */}
          <aside className="lg:sticky lg:top-24 h-fit space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-lift">
              <div className="bg-navy p-6 text-navy-foreground">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-gold text-navy grid place-items-center font-display font-semibold text-lg ring-2 ring-gold/40">
                    {broker.initials}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-gold">Seu corretor</div>
                    <div className="font-display text-lg font-semibold leading-tight">{corretor}</div>
                    <div className="text-xs text-navy-foreground/70">CRECI 12.345 · {broker.conversion}% conversão</div>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <button
                  type="button"
                  onClick={() => window.open(wppUrl, "_blank", "noopener,noreferrer")}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald text-white font-medium text-sm py-3 hover:opacity-90 transition"
                >
                  <MessageCircle className="h-4 w-4" /> Falar pelo WhatsApp
                </button>
                <a
                  href={telUrl}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-border text-foreground font-medium text-sm py-3 hover:border-foreground/40 transition"
                >
                  <Phone className="h-4 w-4" /> Ligar agora
                </a>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a href={`mailto:${broker.email}`} className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition py-2">
                    <Mail className="h-3.5 w-3.5" /> E-mail
                  </a>
                  <a href="#" className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition py-2">
                    <Instagram className="h-3.5 w-3.5" /> Instagram
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-cream p-5 text-xs text-muted-foreground leading-relaxed">
              Visita acompanhada, documentação e financiamento orientados pelo próprio corretor.
              Atendimento exclusivo de segunda a sábado.
            </div>
          </aside>
        </div>

        {/* Outros imóveis do corretor */}
        {otherProperties.length > 0 && (
          <section className="pb-20">
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
                  Mais opções
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                  Outros imóveis de {broker.name.split(" ")[0]}
                </h2>
              </div>
              <Link
                to="/l/$slug/vitrine"
                params={{ slug }}
                className="hidden md:inline text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition"
              >
                Ver vitrine completa →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {otherProperties.map((p) => (
                <Link
                  key={p.id}
                  to="/l/$slug/vitrine/$propertyId"
                  params={{ slug, propertyId: p.id }}
                  className="group rounded-2xl overflow-hidden border border-border/70 bg-card hover:shadow-lift hover:-translate-y-0.5 transition"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    {p.highlight && (
                      <span className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.18em] bg-gold text-navy px-2 py-1 rounded-full font-semibold">
                        {p.highlight}
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {p.type} · {p.code}
                    </div>
                    <div className="font-display text-base font-semibold leading-tight line-clamp-1">
                      {p.title}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {p.neighborhood}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <div className="text-xs text-muted-foreground">
                        {p.bedrooms}d · {p.bathrooms}b · {p.area}m²
                      </div>
                      <div className="font-display text-sm font-semibold text-emerald">
                        {fmtBRL(p.price)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-5 py-8 flex items-center justify-between text-sm">
          <Link to="/l/$slug/vitrine" params={{ slug }} className="text-muted-foreground hover:text-foreground">
            ← Ver todos os imóveis
          </Link>
          <Link to="/" className="text-[11px] tracking-widest uppercase text-muted-foreground hover:text-foreground">
            Powered by <span className="font-semibold text-foreground">LeadLink</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
