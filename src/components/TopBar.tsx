import { useRouteContext } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Search, HelpCircle, Home, UserRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { searchLeads } from "@/server-fns/leads";
import { searchProperties } from "@/server-fns/properties";
import { shouldRunGlobalSearch } from "@/lib/global-search";
import { getMeuLinkConfig } from "@/server-fns/meu-link";
import { safeSrc } from "@/lib/media";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type SearchResult = {
  id: string;
  type: "lead" | "property";
  title: string;
  subtitle: string;
  href: string;
};

type LeadSearchRow = {
  id: string;
  name?: string;
  source?: string;
  region?: string;
  phone?: string;
};

type PropertySearchRow = {
  id: string;
  title?: string;
  code?: string;
  neighborhood?: string;
  city?: string;
  status?: string;
};

export function TopBar({ title }: { title: string; subtitle?: string }) {
  const ctx = useRouteContext({ strict: false }) as {
    user?: { name?: string; avatarUrl?: string | null };
  };
  const user = ctx.user;
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [supportOpen, setSupportOpen] = useState(false);
  const notifications: Array<{ id: string; title: string }> = [];
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [query]);
  useEffect(() => {
    let cancelled = false;
    if (!shouldRunGlobalSearch(debouncedQuery)) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    Promise.all([
      searchLeads({ data: debouncedQuery }).catch(() => []),
      searchProperties({ data: debouncedQuery }).catch(() => []),
    ])
      .then(([leads, properties]) => {
        if (cancelled) return;
        setResults([
          ...(leads as LeadSearchRow[]).map((lead) => ({
            id: lead.id,
            type: "lead" as const,
            title: lead.name ?? "Lead sem nome",
            subtitle: [lead.source, lead.region, lead.phone].filter(Boolean).join(" · "),
            href: `/leads/${lead.id}`,
          })),
          ...(properties as PropertySearchRow[]).map((property) => ({
            id: property.id,
            type: "property" as const,
            title: property.title ?? "Imóvel sem título",
            subtitle: [property.code, property.neighborhood, property.city, property.status]
              .filter(Boolean)
              .join(" · "),
            href: "/imoveis",
          })),
        ]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);
  useEffect(() => {
    let cancelled = false;

    getMeuLinkConfig()
      .then((config) => {
        if (cancelled) return;
        const nextPhotoUrl =
          config && typeof config === "object" && "photoUrl" in config
            ? String((config as { photoUrl?: unknown }).photoUrl ?? "")
            : "";
        setProfilePhotoUrl(nextPhotoUrl);
      })
      .catch(() => {
        if (cancelled) return;
        setProfilePhotoUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, []);
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";
  const avatarText = mounted ? initials : "?";
  const topbarAvatarUrl =
    safeSrc(profilePhotoUrl) ||
    safeSrc((user as { avatarUrl?: unknown } | undefined)?.avatarUrl) ||
    undefined;

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center gap-4 border-b border-border/70 bg-background/85 backdrop-blur-xl px-4 md:px-8">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <div className="hidden md:block min-w-0">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80">
          Leadlink
        </div>
        <h1 className="font-display text-[19px] font-semibold leading-none tracking-tight truncate -mt-0.5">
          {title}
        </h1>
      </div>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar leads e imóveis..."
            className="pl-9 h-10 w-[220px] md:w-[340px] bg-card border-border/80 rounded-full text-sm focus-visible:ring-emerald/40"
          />
          {query.trim().length >= 2 && (
            <div className="absolute right-0 top-12 z-50 w-[340px] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
              <div className="border-b border-border px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Busca global
              </div>
              {searching ? (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando...
                </div>
              ) : results.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  Nenhum resultado encontrado.
                </div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto py-1">
                  {results.map((result) => (
                    <a
                      key={`${result.type}-${result.id}`}
                      href={result.href}
                      onClick={() => setQuery("")}
                      className="flex items-start gap-3 px-3 py-2.5 hover:bg-secondary/70"
                    >
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                        {result.type === "lead" ? (
                          <UserRound className="h-4 w-4" />
                        ) : (
                          <Home className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{result.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-10 w-10 hidden md:inline-flex"
          onClick={() => setSupportOpen(true)}
        >
          <HelpCircle className="h-[18px] w-[18px] text-muted-foreground" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full h-10 w-10">
              <Bell className="h-[18px] w-[18px] text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold">
              Notificações
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                Nenhuma notificação no momento.
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
        <div className="h-8 w-px bg-border mx-1 hidden md:block" />
        <Avatar className="h-10 w-10 ring-1 ring-border">
          <AvatarImage src={topbarAvatarUrl} alt={user?.name || "Usuário"} />
          <AvatarFallback className="bg-navy text-gold text-xs font-semibold">
            {avatarText}
          </AvatarFallback>
        </Avatar>
      </div>
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Suporte LeadLink</DialogTitle>
            <DialogDescription>
              Precisa de ajuda? Entre em contato com o canal oficial de suporte da sua operação.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Este espaço pode ser usado para orientar o usuário enquanto o atendimento é acionado.
          </p>
        </DialogContent>
      </Dialog>
    </header>
  );
}
