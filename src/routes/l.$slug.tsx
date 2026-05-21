import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MeuLinkPreview } from "@/components/MeuLinkPreview";
import { loadConfig, type MeuLinkConfig, EMPTY_MEU_LINK_CONFIG } from "@/lib/meu-link-store";
import { getPropertiesBySlug } from "@/server-fns/properties";

type PublicMeuLinkParams = { slug: string };

export const Route = createFileRoute("/l/$slug")({
  head: ({ params }: { params: PublicMeuLinkParams }) => ({
    meta: [
      { title: `${params.slug} — LeadLink` },
      { name: "description", content: "Página pública do corretor no LeadLink" },
    ],
  }),
  loader: async ({ params }: { params: PublicMeuLinkParams }) => ({
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
  const { data: liveCfg = cfg } = useQuery({
    queryKey: ["public-meu-link", slug, "config"],
    queryFn: () => loadConfig(slug),
    initialData: cfg,
    staleTime: 90_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
  const { data: liveProps = props } = useQuery({
    queryKey: ["public-meu-link", slug, "properties"],
    queryFn: () => getPropertiesBySlug({ data: slug }),
    initialData: props,
    staleTime: 90_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  if (!liveCfg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-xs text-muted-foreground tracking-widest uppercase">Carregando…</div>
      </div>
    );
  }

  const view: MeuLinkConfig = liveCfg.slug === slug ? liveCfg : { ...EMPTY_MEU_LINK_CONFIG, slug };
  return (
    <MeuLinkPreview
      cfg={view}
      fullScreen
      featuredProperties={buildFeaturedProps(view, liveProps)}
    />
  );
}

function buildFeaturedProps(
  cfg: MeuLinkConfig,
  props: Awaited<ReturnType<typeof getPropertiesBySlug>>,
) {
  const byId = new Map(
    props.map((p: Awaited<ReturnType<typeof getPropertiesBySlug>>[number]) => [p.id, p] as const),
  );
  const manual = (cfg.featuredIds || []).map((id) => byId.get(id)).filter(Boolean);
  if (manual.length > 0) return manual;

  const highlighted = props.filter((p: Awaited<ReturnType<typeof getPropertiesBySlug>>[number]) =>
    Boolean(p.highlight),
  );
  if (highlighted.length > 0) return highlighted.slice(0, 3);

  return props.slice(0, 3);
}
