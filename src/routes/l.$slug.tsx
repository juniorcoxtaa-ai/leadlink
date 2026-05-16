import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MeuLinkPreview } from "@/components/MeuLinkPreview";
import { loadConfig, type MeuLinkConfig, EMPTY_MEU_LINK_CONFIG } from "@/lib/meu-link-store";
import { getPropertiesBySlug } from "@/server-fns/properties";

export const Route = createFileRoute("/l/$slug")({
  head: ({ params }: any) => ({
    meta: [
      { title: `${params.slug} — LeadLink` },
      { name: "description", content: "Página pública do corretor no LeadLink" },
    ],
  }),
  loader: async ({ params }: any) => ({
    cfg: await loadConfig(params.slug),
    props: await getPropertiesBySlug({ data: params.slug }),
  }),
  component: PublicLinkPage,
});

function PublicLinkPage() {
  const { slug } = Route.useParams();
  const { cfg, props } = Route.useLoaderData() as {
    cfg: MeuLinkConfig | null;
    props: Awaited<ReturnType<typeof getPropertiesBySlug>>;
  };
  const [liveCfg, setLiveCfg] = useState<MeuLinkConfig | null>(cfg);

  useEffect(() => {
    const refresh = () => loadConfig(slug).then(setLiveCfg);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [slug]);

  useEffect(() => {
    setLiveCfg(cfg);
  }, [cfg]);

  if (!liveCfg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-xs text-muted-foreground tracking-widest uppercase">Carregando…</div>
      </div>
    );
  }

  const view: MeuLinkConfig = liveCfg.slug === slug ? liveCfg : { ...EMPTY_MEU_LINK_CONFIG, slug };
  return <MeuLinkPreview cfg={view} fullScreen featuredProperties={buildFeaturedProps(view, props)} />;
}

function buildFeaturedProps(cfg: MeuLinkConfig, props: Awaited<ReturnType<typeof getPropertiesBySlug>>) {
  const byId = new Map(props.map((p: any) => [p.id, p]));
  const manual = (cfg.featuredIds || []).map((id) => byId.get(id)).filter(Boolean);
  if (manual.length > 0) return manual;

  const highlighted = props.filter((p: any) => Boolean(p.highlight));
  if (highlighted.length > 0) return highlighted.slice(0, 3);

  return props.slice(0, 3);
}


