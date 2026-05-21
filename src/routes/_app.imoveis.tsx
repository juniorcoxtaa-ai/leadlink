import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PropertyFormDialog } from "@/components/PropertyFormDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bed,
  Bath,
  Car,
  Maximize2,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Eye,
  Users,
  ExternalLink,
  Image as ImageIcon,
  Home,
  Pencil,
} from "lucide-react";
import { getProperties, getPropertyById, updatePropertyStatus } from "@/server-fns/properties";
import { getMySlug } from "@/server-fns/meu-link";
import { toast } from "sonner";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { UpgradeModal } from "@/components/UpgradeCTA";
import { EmptyState } from "@/components/EmptyState";
import { safeSrc } from "@/lib/media";

export const Route = createFileRoute("/_app/imoveis")({
  head: () => ({ meta: [{ title: "Imóveis — Leadlink" }] }),
  loader: async () => {
    const [items, mySlug] = await Promise.all([getProperties(), getMySlug().catch(() => null)]);
    return { items, mySlug };
  },
  component: ImoveisPage,
});

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function ImoveisPage() {
  const [items, setItems] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState("Todos");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const { items: loaded, mySlug } = Route.useLoaderData() as {
    items: any[];
    mySlug: string | null;
  };
  const plan = usePlanLimits();

  useEffect(() => setItems(loaded || []), [loaded]);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (activeType !== "Todos" && p.type !== activeType) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return [p.code, p.title, p.neighborhood, p.city, p.highlight].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q),
      );
    });
  }, [items, query, activeType]);

  const total = filtered.length;
  const disp = filtered.filter((p) => p.status === "Disponível").length;
  const vgv = filtered
    .filter((p) => p.status !== "Vendido")
    .reduce((s, p) => s + Number(p.price || 0), 0);
  const freeAtLimit = plan.isFree && items.length >= 3;

  const handleCreateClick = () => {
    if (freeAtLimit) setLimitOpen(true);
    else setCreateOpen(true);
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Portfólio
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Imóveis do escritório
          </h2>
          <p className="text-sm text-muted-foreground">
            {total} imóveis · {disp} disponíveis · VGV {fmtBRL(vgv)}
          </p>
        </div>
        <div className="flex gap-2">
          {mySlug ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/l/$slug/vitrine" params={{ slug: mySlug }} target="_blank">
                <ExternalLink className="h-4 w-4 mr-1.5" /> Ver vitrine pública
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                toast.error("Configure seu Meu Link primeiro para abrir sua vitrine pública")
              }
            >
              <ExternalLink className="h-4 w-4 mr-1.5" /> Ver vitrine pública
            </Button>
          )}
          <Button variant="outline" className="rounded-full">
            <SlidersHorizontal className="h-4 w-4 mr-1.5" /> Filtros
          </Button>
          <Button
            className="bg-navy text-navy-foreground hover:bg-navy/90 rounded-full"
            onClick={handleCreateClick}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Cadastrar imóvel
          </Button>
        </div>
      </div>

      <Card className="p-3 border-border/70 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, bairro, característica…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 border-transparent bg-secondary/60 focus-visible:bg-card"
          />
        </div>
        {["Todos", "Apartamento", "Cobertura", "Casa", "Studio", "Comercial"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`rounded-full px-3 py-1.5 text-xs border transition ${activeType === t ? "bg-navy text-navy-foreground border-navy" : "border-border bg-background hover:bg-secondary"}`}
          >
            {t}
          </button>
        ))}
      </Card>

      {items.length === 0 ? (
        <EmptyState
          icon={<Home className="h-5 w-5" />}
          title="Nenhum imóvel cadastrado ainda"
          description="Cadastre seu primeiro imóvel para montar uma vitrine pública mais completa."
          action={<Button onClick={handleCreateClick}>Cadastrar primeiro imóvel</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="Nenhum imóvel encontrado"
          description="Ajuste a busca ou os filtros para ver outros imóveis do seu portfólio."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setActiveType("Todos");
              }}
            >
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className="overflow-hidden border-border/70 group hover:shadow-lift transition-all p-0"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                {safeSrc(p.image) ? (
                  <img
                    src={safeSrc(p.image)}
                    alt={p.title}
                    loading="lazy"
                    width={640}
                    height={480}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mb-2 opacity-70" />
                    <span className="text-xs uppercase tracking-wider">SEM IMAGEM</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                  {p.highlight && (
                    <span className="px-2.5 py-1 rounded-full bg-navy/90 text-gold text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
                      {p.highlight}
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3">
                  <Badge
                    variant="outline"
                    className={`${statusStyle[p.status] || ""} rounded-full font-medium backdrop-blur bg-card/80`}
                  >
                    {p.status}
                  </Badge>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                  <div className="bg-card/95 backdrop-blur rounded-lg px-3 py-1.5">
                    <div className="font-display text-lg font-semibold leading-none text-emerald">
                      {fmtBRL(p.price)}
                    </div>
                  </div>
                  <div className="bg-card/95 backdrop-blur rounded-full px-2.5 py-1 text-[11px] font-mono text-foreground">
                    {p.code}
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {p.neighborhood} · {p.city}
                  </div>
                  <h3 className="font-display text-lg font-semibold leading-tight mt-1">
                    {p.title}
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground border-y border-border py-2.5">
                  {Number(p.bedrooms) > 0 && (
                    <span className="flex items-center gap-1">
                      <Bed className="h-3.5 w-3.5" />
                      {p.bedrooms}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Bath className="h-3.5 w-3.5" />
                    {p.bathrooms}
                  </span>
                  <span className="flex items-center gap-1">
                    <Car className="h-3.5 w-3.5" />
                    {p.parking}
                  </span>
                  <span className="flex items-center gap-1">
                    <Maximize2 className="h-3.5 w-3.5" />
                    {p.area}m²
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 ring-1 ring-border">
                      <AvatarFallback className="bg-navy text-gold text-[10px] font-semibold">
                        {(p.brokerInitials || p.brokerName || "LL").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-[11px] text-muted-foreground leading-tight">
                      <div className="font-medium text-foreground">
                        {(p.brokerName || "Leadlink").split(" ")[0]}
                      </div>
                      <div>Captador</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {p.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {p.leadsCount ?? p.leads ?? 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <select
                    value={p.status}
                    onChange={(e) => {
                      const next = e.target.value;
                      setItems((prev) =>
                        prev.map((item) => (item.id === p.id ? { ...item, status: next } : item)),
                      );
                      updatePropertyStatus({ data: { id: p.id, status: next } }).catch(
                        (error: any) => toast.error(error?.message || "Falha ao atualizar status"),
                      );
                      toast.success("Status do imóvel atualizado");
                    }}
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                  >
                    <option>Disponível</option>
                    <option>Reservado</option>
                    <option>Vendido</option>
                    <option>Em captação</option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full ml-auto"
                    onClick={async () => {
                      try {
                        const fullProperty = await getPropertyById({ data: p.id });
                        setEditing(fullProperty);
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Falha ao carregar imóvel",
                        );
                      }
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PropertyFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(property) => setItems((prev) => [property, ...prev])}
      />
      <PropertyFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        property={editing}
        onSaved={(property) => {
          setItems((prev) =>
            prev.map((item) => (item.id === (property as any).id ? property : item)),
          );
          setEditing(null);
        }}
      />

      <UpgradeModal
        open={limitOpen}
        onOpenChange={setLimitOpen}
        title="Limite de imóveis atingido"
        description="Você já cadastrou os 3 imóveis disponíveis no plano Free. No plano Pro, você cadastra imóveis ilimitados e libera mais recursos no seu Meu Link."
        benefits={[
          "Imóveis ilimitados",
          "Vitrine mais completa",
          "Mais opções para seus leads",
          "Imagem de fundo, vídeos e quiz editável no Meu Link",
        ]}
        primaryLabel="Fazer upgrade para Pro"
        secondaryLabel="Ver planos"
        onPrimary={() => setLimitOpen(false)}
      />

      {limitOpen && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute right-6 bottom-6 hidden xl:block w-[320px]">
            <Card className="p-4 bg-secondary/70 border-border/70 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <Badge>Pro</Badge>
                <span className="text-sm font-medium">Preview do Pro</span>
              </div>
              <div className="space-y-3 opacity-70">
                <div className="h-28 rounded-xl bg-gradient-to-br from-zinc-300 to-zinc-200" />
                <div className="h-4 w-2/3 rounded bg-zinc-300" />
                <div className="h-4 w-1/2 rounded bg-zinc-300" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-14 rounded bg-zinc-300" />
                  <div className="h-14 rounded bg-zinc-300" />
                  <div className="h-14 rounded bg-zinc-300" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

const statusStyle: Record<string, string> = {
  Disponível: "bg-emerald/10 text-emerald border-emerald/20",
  Reservado: "bg-warning/10 text-warning border-warning/20",
  Vendido: "bg-muted text-muted-foreground border-border",
  "Em captação": "bg-navy/10 text-navy border-navy/20",
};
