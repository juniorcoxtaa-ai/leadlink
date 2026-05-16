import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bed, Bath, Car, Maximize2, MapPin, Plus, Search, SlidersHorizontal, Eye, Users, ExternalLink,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { properties, brokers } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/imoveis")({
  head: () => ({ meta: [{ title: "Imóveis — Leadlink" }] }),
  component: ImoveisPage,
});

const PUBLIC_SLUG = "sandra-lima";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const statusStyle: Record<string, string> = {
  "Disponível": "bg-emerald/10 text-emerald border-emerald/20",
  "Reservado": "bg-warning/10 text-warning border-warning/20",
  "Vendido": "bg-muted text-muted-foreground border-border",
  "Em captação": "bg-navy/10 text-navy border-navy/20",
};

function ImoveisPage() {
  const total = properties.length;
  const disp = properties.filter((p) => p.status === "Disponível").length;
  const vgv = properties.filter(p => p.status !== "Vendido").reduce((s, p) => s + p.price, 0);

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Portfólio</div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Imóveis do escritório</h2>
          <p className="text-sm text-muted-foreground">{total} imóveis · {disp} disponíveis · VGV {fmtBRL(vgv)}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/l/$slug/vitrine" params={{ slug: PUBLIC_SLUG }} target="_blank">
              <ExternalLink className="h-4 w-4 mr-1.5" /> Ver vitrine pública
            </Link>
          </Button>
          <Button variant="outline" className="rounded-full"><SlidersHorizontal className="h-4 w-4 mr-1.5" /> Filtros</Button>
          <Button className="bg-navy text-navy-foreground hover:bg-navy/90 rounded-full"><Plus className="h-4 w-4 mr-1.5" /> Cadastrar imóvel</Button>
        </div>
      </div>

      {/* Filters bar */}
      <Card className="p-3 border-border/70 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código, bairro, característica…" className="pl-9 border-transparent bg-secondary/60 focus-visible:bg-card" />
        </div>
        {["Todos", "Apartamento", "Cobertura", "Casa", "Studio", "Comercial"].map((t, i) => (
          <Badge key={t} variant={i === 0 ? "default" : "outline"} className={`rounded-full px-3 py-1.5 cursor-pointer font-normal ${i === 0 ? "bg-navy text-navy-foreground hover:bg-navy/90" : "border-border"}`}>
            {t}
          </Badge>
        ))}
      </Card>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {properties.map((p) => {
          const broker = brokers.find((b) => b.id === p.brokerId)!;
          return (
            <Card key={p.id} className="overflow-hidden border-border/70 group hover:shadow-lift transition-all p-0">
              <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                <img src={p.image} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 flex gap-2">
                  {p.highlight && (
                    <span className="px-2.5 py-1 rounded-full bg-navy/90 text-gold text-[10px] font-semibold uppercase tracking-wider backdrop-blur">{p.highlight}</span>
                  )}
                </div>
                <div className="absolute top-3 right-3">
                  <Badge variant="outline" className={`${statusStyle[p.status]} rounded-full font-medium backdrop-blur bg-card/80`}>{p.status}</Badge>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                  <div className="bg-card/95 backdrop-blur rounded-lg px-3 py-1.5">
                    <div className="font-display text-lg font-semibold leading-none text-emerald">{fmtBRL(p.price)}</div>
                  </div>
                  <div className="bg-card/95 backdrop-blur rounded-full px-2.5 py-1 text-[11px] font-mono text-foreground">{p.code}</div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {p.neighborhood} · {p.city}
                  </div>
                  <h3 className="font-display text-lg font-semibold leading-tight mt-1">{p.title}</h3>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground border-y border-border py-2.5">
                  {p.bedrooms > 0 && <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{p.bedrooms}</span>}
                  <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{p.bathrooms}</span>
                  <span className="flex items-center gap-1"><Car className="h-3.5 w-3.5" />{p.parking}</span>
                  <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{p.area}m²</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 ring-1 ring-border">
                      <AvatarFallback className="bg-navy text-gold text-[10px] font-semibold">{broker.initials}</AvatarFallback>
                    </Avatar>
                    <div className="text-[11px] text-muted-foreground leading-tight">
                      <div className="font-medium text-foreground">{broker.name.split(" ")[0]}</div>
                      <div>Captador</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{p.views}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{p.leads}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
