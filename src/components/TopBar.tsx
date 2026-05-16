import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Search, HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { data: session } = useSession();
  const user = session?.user;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
            placeholder="Buscar leads, imóveis, corretores…"
            className="pl-9 h-10 w-[220px] md:w-[340px] bg-card border-border/80 rounded-full text-sm focus-visible:ring-emerald/40"
          />
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
