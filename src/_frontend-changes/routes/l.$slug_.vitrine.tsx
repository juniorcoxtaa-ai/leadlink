import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bed, Bath, Car, Maximize2, MapPin, Search, ArrowUpRight, Instagram, MessageCircle, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { properties, brokers } from "@/lib/mock-data";

export const Route = createFileRoute("/l/$slug_/vitrine")({
  head: ({ params }) => ({
    meta: [
      { title: `Vitrine de imóveis — ${params.slug} · LeadLink` },
      { name: "description", content: "Portfólio premium de imóveis selecionados pelo corretor." },
    ],
  }),
  component: VitrinePage,
});

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function prettyName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

const TYPES = ["Todos", "Apartamento", "Cobertura", "Casa", "Studio", "Comercial"] as const;

function VitrinePage() {
  const { slug } = Route.useParams();
  const broker = brokers[0];
  const corretor = prettyName(slug);
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("Todos");

  const list = useMemo(
    () =>
      properties
        .filter((p) => p.status !== "Vendido")
        .filter((p) => (type === "Todos" ? true : p.type === type))
        .filter((p) =>
          q.trim() === ""
            ? true
            : `${p.title} ${p.neighborhood} ${p.code}`.toLowerCase().includes(q.toLowerCase()),
        ),
    [q, type],
  );

  return (
    <div className="min-h-screen bg-cream text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur bg-cream/80 border-b border-border/60">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/l/$slug" params={{ slug }} className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-full bg-navy text-gold grid place-items-center font-display font-semibold ring-1 ring-navy/20">
              {corretor.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="leading-tight">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Vitrine de</div>
              <div className="font-display font-semibold text-sm">{corretor}</div>
            </div>
          </Link>
          <a
            href={`https://wa.me/5511999999999?text=Olá%20${encodeURIComponent(corretor)},%20vi%20sua%20vitrine%20no%20LeadLink`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald text-white text-xs font-medium px-4 py-2 hover:opacity-90 transition"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Falar agora
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklab,_var(--gold)_22%,_transparent)_0%,_transparent_55%)]" />
        <div className="max-w-6xl mx-auto px-5 py-14 md:py-20 grid md:grid-cols-[1.1fr_.9fr] gap-10 items-end">
          <div className="space-y-4">
            <div className="text-[10px] uppercase tracking-[0.28em] text-gold font-semibold">Portfólio exclusivo</div>
            <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Imóveis selecionados <br />
              <span className="italic text-navy">a dedo por {corretor.split(" ")[0]}.</span>
            </h1>
            <p className="text-muted-foreground max-w-md">
              Uma curadoria pessoal dos melhores endereços. Cada imóvel é visitado, fotografado e
              negociado diretamente comigo — sem intermediários.
            </p>
            <div className="flex items-center gap-3 pt-2 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> CRECI 12.345
              </span>
              <span className="text-border">·</span>
              <a className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition" href="#">
                <Instagram className="h-3.5 w-3.5" /> @{slug}
              </a>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {properties.slice(0, 3).map((p, i) => (
              <div
                key={p.id}
                className={`relative aspect-[3/4] rounded-2xl overflow-hidden ring-1 ring-border/60 shadow-lift ${
                  i === 1 ? "translate-y-6" : ""
                }`}
              >
                <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 to-transparent p-3">
                  <div className="text-[10px] text-gold uppercase tracking-widest">{p.neighborhood}</div>
                  <div className="text-white text-xs font-medium leading-tight">{fmtBRL(p.price)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border/60 bg-card/50">
        <div className="max-w-6xl mx-auto px-5 py-5 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por bairro, código, título…"
              className="pl-9 bg-cream border-border"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => {
              const active = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    active
                      ? "bg-navy text-navy-foreground border-navy"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-5 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Disponíveis</div>
            <h2 className="font-display text-2xl font-semibold">{list.length} imóveis no portfólio</h2>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl py-20 text-center text-muted-foreground text-sm">
            Nenhum imóvel encontrado com esses filtros.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map((p) => (
              <Link
                key={p.id}
                to="/l/$slug/vitrine/$propertyId"
                params={{ slug, propertyId: p.id }}
                className="group block"
              >
                <article className="rounded-2xl overflow-hidden bg-card border border-border/70 hover:border-navy/40 hover:shadow-lift transition-all">
                  <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                    <img
                      src={p.image}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {p.highlight && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-navy/90 text-gold text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
                        {p.highlight}
                      </span>
                    )}
                    <Badge variant="outline" className="absolute top-3 right-3 rounded-full font-mono text-[10px] bg-card/90 backdrop-blur border-border">
                      {p.code}
                    </Badge>
                  </div>
                  <div className="p-5 space-y-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {p.neighborhood}, {p.city}
                      </div>
                      <h3 className="font-display text-lg font-semibold leading-tight mt-1 group-hover:text-navy transition">
                        {p.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                      {p.bedrooms > 0 && <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{p.bedrooms}</span>}
                      <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{p.bathrooms}</span>
                      <span className="flex items-center gap-1"><Car className="h-3.5 w-3.5" />{p.parking}</span>
                      <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{p.area}m²</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="font-display text-lg font-semibold text-emerald">{fmtBRL(p.price)}</div>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-navy transition">
                        Ver detalhes <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 mt-10">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="text-muted-foreground">
            © {new Date().getFullYear()} {corretor} · {broker.email}
          </div>
          <Link to="/" className="text-[11px] tracking-widest uppercase text-muted-foreground hover:text-foreground">
            Powered by <span className="font-semibold text-foreground">LeadLink</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
