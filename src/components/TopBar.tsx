import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Search, HelpCircle, Home, UserRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { searchLeads } from "@/server-fns/leads";
import { searchProperties } from "@/server-fns/properties";
import { shouldRunGlobalSearch } from "@/lib/global-search";

type SearchResult = {
  id: string;
  type: "lead" | "property";
  title: string;
  subtitle: string;
  href: string;
};

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { data: session } = useSession();
  const user = session?.user;
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
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
          ...(leads as any[]).map((lead) => ({
            id: lead.id,
            type: "lead" as const,
            title: lead.name,
            subtitle: [lead.source, lead.region, lead.phone].filter(Boolean).join(" · "),
            href: `/leads/${lead.id}`,
          })),
          ...(properties as any[]).map((property) => ({
            id: property.id,
            type: "property" as const,
            title: property.title,
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
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const avatarText = mounted ? initials : "?";

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center gap-4 border-b border-border/70 bg-background/85 backdrop-blur-xl px-4 md:px-8">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <div className="hidden md:block min-w-0">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80">Leadlink</div>
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
                <div className="px-3 py-4 text-sm text-muted-foreground">Nenhum resultado encontrado.</div>
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
                        {result.type === "lead" ? <UserRound className="h-4 w-4" /> : <Home className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{result.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hidden md:inline-flex">
          <HelpCircle className="h-[18px] w-[18px] text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="relative rounded-full h-10 w-10">
          <Bell className="h-[18px] w-[18px] text-muted-foreground" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald ring-2 ring-background" />
        </Button>
        <div className="h-8 w-px bg-border mx-1 hidden md:block" />
        <Avatar className="h-10 w-10 ring-1 ring-border">
          <AvatarFallback className="bg-navy text-gold text-xs font-semibold">{avatarText}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
