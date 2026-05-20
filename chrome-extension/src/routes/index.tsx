import { createFileRoute } from "@tanstack/react-router";
import { LeadLinkExtensionMvp } from "@/components/leadlink/ExtensionMvp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LeadLink Extension — Sidebar para corretores" },
      {
        name: "description",
        content:
          "Copiloto premium para corretores de imóveis dentro do WhatsApp Web. Identifique leads, envie imóveis e use IA sem sair da conversa.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen w-full bg-[#050507] flex items-stretch md:items-center justify-center md:p-6 relative overflow-hidden">
      {/* ambient bg */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -bottom-32 right-0 w-[460px] h-[460px] rounded-full bg-[#3b2db8]/20 blur-[140px]" />
      </div>

      {/* WhatsApp Web mock background (desktop only) */}
      <div className="hidden md:flex absolute inset-0 items-center justify-center p-10 pr-[400px]">
        <div className="w-full h-full max-w-[1100px] rounded-2xl bg-[#0d0d12] border border-border/60 flex overflow-hidden">
          <div className="w-[280px] border-r border-border/60 p-4 space-y-2">
            <div className="h-8 rounded-md bg-surface/80" />
            <div className="space-y-1.5 mt-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface/60">
                  <div className="w-8 h-8 rounded-full bg-surface" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 w-3/4 rounded bg-surface" />
                    <div className="h-2 w-1/2 rounded bg-surface/70" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="h-14 border-b border-border/60 flex items-center px-4 gap-3">
              <div className="w-8 h-8 rounded-full bg-surface" />
              <div className="space-y-1">
                <div className="h-2.5 w-32 rounded bg-surface" />
                <div className="h-2 w-20 rounded bg-surface/70" />
              </div>
            </div>
            <div className="flex-1 p-6 space-y-3">
              <div className="max-w-[55%] h-10 rounded-2xl bg-surface" />
              <div className="max-w-[40%] h-8 rounded-2xl bg-primary/15 ml-auto" />
              <div className="max-w-[60%] h-12 rounded-2xl bg-surface" />
              <div className="max-w-[35%] h-8 rounded-2xl bg-primary/15 ml-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating sidebar pinned to the right */}
      <div className="relative z-10 md:absolute md:right-0 md:top-0 md:h-screen shadow-2xl shadow-black/50">
        <LeadLinkExtensionMvp />
      </div>
    </div>
  );
}
