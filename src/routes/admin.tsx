import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, signOut } from "@/lib/use-auth";
import { getSession } from "@/server-fns/session";
import { Button } from "@/components/ui/button";
import {
  Shield, LogOut, Users, CreditCard, BarChart3, Home, Layers,
  DollarSign, Activity, FolderKanban, LifeBuoy, UserCog, Settings,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Leadlink" }] }),
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/login" });
    if ((session.user as any).role !== "admin") throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", exact: true, label: "Dashboard", icon: BarChart3 },
  { to: "/admin/usuarios", label: "Corretores", icon: Users },
  { to: "/admin/planos", label: "Planos", icon: Layers },
  { to: "/admin/assinaturas", label: "Assinaturas", icon: CreditCard },
  { to: "/admin/financeiro", label: "Financeiro", icon: DollarSign },
  { to: "/admin/uso", label: "Uso da plataforma", icon: Activity },
  { to: "/admin/conteudo", label: "Conteúdo", icon: FolderKanban },
  { to: "/admin/suporte", label: "Suporte", icon: LifeBuoy },
  { to: "/admin/equipe", label: "Equipe interna", icon: UserCog },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando…</div>;
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center text-center p-6">
        <div className="space-y-3">
          <Shield className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">Apenas administradores podem acessar este painel.</p>
          <Button asChild variant="outline"><Link to="/dashboard">Ir para o app</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col sticky top-0 h-screen">
        <div className="px-4 py-4 border-b border-border flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-navy text-navy-foreground grid place-items-center"><Shield className="h-4 w-4" /></div>
          <div>
            <div className="text-sm font-semibold leading-none">Leadlink Admin</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Painel interno</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={item.exact ? { exact: true } : undefined}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground [&.active]:font-medium"
              activeProps={{ className: "active" }}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-1.5">
          <div className="text-[11px] text-muted-foreground px-1 truncate">{user.email}</div>
          <div className="flex gap-1.5">
            <Button asChild variant="outline" size="sm" className="flex-1"><Link to="/dashboard"><Home className="h-3.5 w-3.5 mr-1" /> App</Link></Button>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6 overflow-x-hidden"><Outlet /></main>
    </div>
  );
}
