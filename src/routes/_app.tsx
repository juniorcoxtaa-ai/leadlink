import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { getSession } from "@/server-fns/session";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/login" });
    return { user: session.user };
  },
  component: AppLayout,
});

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Visão geral" },
  "/leads": { title: "Leads", subtitle: "Pipeline comercial" },
  "/imoveis": { title: "Imóveis", subtitle: "Portfólio do escritório" },
  "/agenda": { title: "Agenda", subtitle: "Visitas e compromissos" },
  "/automacoes": { title: "Automações", subtitle: "Fluxos de WhatsApp e e-mail" },
  "/relatorios": { title: "Relatórios", subtitle: "Performance comercial" },
  "/integracoes": { title: "Integrações", subtitle: "Portais e ferramentas conectadas" },
  "/extensao": { title: "Extensão Atendimento", subtitle: "Chrome extension para WhatsApp Web" },
  "/meu-link": { title: "Meu Link", subtitle: "Página pública para captura de leads" },
  "/dominio-vitrine": { title: "Domínio da Vitrine", subtitle: "Configuração de domínio próprio" },
  "/planos": { title: "Planos", subtitle: "Escolha o plano ideal para o seu negócio" },
  "/configuracoes": { title: "Configurações", subtitle: "Conta, equipe e preferências" },
};

function AppLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const meta =
    TITLES[path] ||
    (path.startsWith("/leads/") ? { title: "Detalhes do Lead", subtitle: path } : { title: "Imovix" });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar title={meta.title} subtitle={meta.subtitle} />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
