import { useEffect, useState } from "react";
import { Link, useRouterState, useRouteContext } from "@tanstack/react-router";
import leadlinkSidebarMark from "@/assets/leadlink-sidebar-mark.jpeg";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  Home,
  Calendar,
  Plug,
  Puzzle,
  LinkIcon,
  Sparkles,
  LogOut,
  Lock,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { signOut } from "@/lib/use-auth";
import { getMeuLinkConfig } from "@/server-fns/meu-link";
import { safeSrc } from "@/lib/media";
import type { LucideIcon } from "lucide-react";

const main = [
  { title: "Visão geral", url: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Imóveis", url: "/imoveis", icon: Home },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
];

const tools = [
  { title: "Integrações", url: "/integracoes", icon: Plug },
  { title: "Extensão", url: "/extensao", icon: Puzzle },
  { title: "Meu Link", url: "/meu-link", icon: LinkIcon },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => path === url || path.startsWith(url + "/");
  const plan = usePlanLimits();
  const ctx = useRouteContext({ strict: false }) as {
    user?: { name?: string; email?: string; avatarUrl?: string | null };
  };
  const user = ctx.user;
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>("");
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

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

  const sidebarAvatarUrl =
    safeSrc(profilePhotoUrl) ||
    safeSrc((user as { avatarUrl?: unknown } | undefined)?.avatarUrl) ||
    undefined;

  const renderItem = (item: { title: string; url: string; icon: LucideIcon }) => {
    const active = isActive(item.url);
    const isExtension = item.url === "/extensao";
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={collapsed ? item.title : undefined}
          className="h-10 rounded-lg data-[active=true]:bg-card data-[active=true]:text-foreground data-[active=true]:shadow-elegant hover:bg-sidebar-accent transition-all"
        >
          <Link to={item.url} className="relative flex items-center gap-3">
            {active && (
              <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-emerald" />
            )}
            <item.icon
              className={`h-[17px] w-[17px] ${active ? "text-emerald" : "text-sidebar-foreground/70"}`}
            />
            {!collapsed && (
              <span className="text-[13px] font-medium tracking-tight">{item.title}</span>
            )}
            {!collapsed && isExtension && plan.isFree && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground">
                <Lock className="h-3 w-3" /> Pro
              </span>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2.5 px-2 py-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background shadow-elegant overflow-hidden">
            <img src={leadlinkSidebarMark} alt="LeadLink" className="h-full w-full object-cover" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display text-[17px] font-semibold text-foreground">Leadlink</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Boutique CRM
              </div>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/planos")}
                  tooltip={collapsed ? "Ver Planos" : undefined}
                  className="h-10 rounded-lg bg-gradient-to-r from-gold/20 to-gold/10 hover:from-gold/30 hover:to-gold/20 border border-gold/30 data-[active=true]:from-gold/40 data-[active=true]:to-gold/30 transition-all"
                >
                  <Link
                    to="/planos"
                    search={{ success: undefined, canceled: undefined }}
                    className="flex items-center gap-3"
                  >
                    <Sparkles className="h-[17px] w-[17px] text-gold" />
                    {!collapsed && (
                      <span className="text-[13px] font-semibold tracking-tight text-foreground">
                        Ver Planos
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 px-2">
              Operação
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>{main.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 px-2">
              Ferramentas
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>{tools.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar className="h-9 w-9 ring-1 ring-border">
            {sidebarAvatarUrl && (
              <AvatarImage src={sidebarAvatarUrl} alt={user?.name || "Usuário"} />
            )}
            <AvatarFallback className="bg-navy text-gold font-semibold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="leading-tight min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-foreground truncate">
                {user?.name || "Usuário"}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">{user?.email || ""}</div>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={signOut}
              title="Sair"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
