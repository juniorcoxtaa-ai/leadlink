import { Link, useRouterState } from "@tanstack/react-router";
import leadlinkLogo from "@/assets/leadlink-logo.png";
import {
  LayoutDashboard,
  Users,
  Workflow,
  BarChart3,
  Settings,
  Home,
  Calendar,
  Plug,
  Puzzle,
  LinkIcon,
  Building2,
  Sparkles,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const main = [
  { title: "Visão geral", url: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Imóveis", url: "/imoveis", icon: Home },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
];

const tools = [
  { title: "Automações", url: "/automacoes", icon: Workflow },
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

  const renderItem = (item: { title: string; url: string; icon: any }) => {
    const active = isActive(item.url);
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
            <item.icon className={`h-[17px] w-[17px] ${active ? "text-emerald" : "text-sidebar-foreground/70"}`} />
            {!collapsed && <span className="text-[13px] font-medium tracking-tight">{item.title}</span>}
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
            <img src={leadlinkLogo} alt="Leadlink" className="h-8 w-8 object-contain" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display text-[17px] font-semibold text-foreground">Leadlink</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Boutique CRM</div>
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
                  <Link to="/planos" className="flex items-center gap-3">
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
            <AvatarFallback className="bg-navy text-gold font-semibold text-xs">MC</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <div className="text-[13px] font-semibold text-foreground truncate">Mariana Costa</div>
              <div className="text-[10px] text-muted-foreground truncate">Corretora Sênior · CRECI 142.318</div>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
