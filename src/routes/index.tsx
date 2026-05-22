import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getSession } from "@/server-fns/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock3,
  LinkIcon,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import leadlinkLogo from "@/assets/leadlink-logo.png";
import heroImg from "@/assets/leadlink-hero.jpg";
import vitrineTabletImg from "@/assets/leadlink-vitrine-tablet.png";
import quizFlowImg from "@/assets/leadlink-quiz-flow.png";
import { MetaPixelScript } from "@/components/MetaPixelScript";
import { getPublicGlobalTrackingSettings } from "@/server-fns/tracking";
import { trackMetaCustomEvent } from "@/lib/meta-pixel";

const PRELAUNCH_DATE = new Date("2026-05-25T00:00:00-03:00").getTime();
const PRELAUNCH_WHATSAPP_URL = "https://chat.whatsapp.com/LGC6EMpPKtqLPuz7Z89dhB";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (session?.user) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getPublicGlobalTrackingSettings(),
  head: () => ({
    meta: [
      { title: "LeadLink — Pré-lançamento em 25/05/2026" },
      {
        name: "description",
        content:
          "O pré-lançamento do LeadLink começa em 25/05/2026 com acesso antecipado a uma infraestrutura inteligente para captação, organização e distribuição de leads imobiliários.",
      },
      { property: "og:title", content: "LeadLink — Pré-lançamento em 25/05/2026" },
      {
        property: "og:description",
        content:
          "Infraestrutura inteligente para transformar visitantes em atendimentos qualificados pelo WhatsApp.",
      },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: LinkIcon,
    title: "Entrada comercial inteligente",
    desc: "Portfólio, contexto e qualificação inicial em um fluxo pensado para transformar visita em conversa relevante.",
  },
  {
    icon: MessageCircle,
    title: "Operação orientada ao WhatsApp",
    desc: "Mais velocidade no primeiro atendimento, mais critério no repasse e menos perda de oportunidade.",
  },
  {
    icon: Users,
    title: "Distribuição de leads com lógica",
    desc: "Organize melhor a chegada dos contatos e dê visibilidade ao time comercial sobre cada nova oportunidade.",
  },
  {
    icon: Calendar,
    title: "Cadência comercial mais clara",
    desc: "Acompanhe follow-ups, visitas e próximos passos sem depender de improviso operacional.",
  },
  {
    icon: BarChart3,
    title: "Leitura de performance",
    desc: "Saiba o que gera mais interesse, quais canais avançam melhor e onde a operação pode responder mais rápido.",
  },
  {
    icon: Workflow,
    title: "Estrutura pronta para escala",
    desc: "Uma base premium para imobiliárias e corretores que precisam organizar captação e atendimento com consistência.",
  },
];

const benefits = [
  "Captação mais organizada desde o primeiro clique",
  "Distribuição inteligente de leads para o time comercial",
  "Atendimento via WhatsApp com contexto e velocidade",
  "Visão centralizada da operação imobiliária",
  "Estrutura premium para imobiliárias e corretores em crescimento",
];

function getTimeLeft() {
  const diff = PRELAUNCH_DATE - Date.now();
  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function CountdownCard() {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  if (!timeLeft) {
    return (
      <div className="rounded-2xl border border-gold/25 bg-card/80 px-5 py-4 text-sm font-medium text-foreground shadow-soft backdrop-blur">
        O pré-lançamento começou.
      </div>
    );
  }

  const items = [
    { label: "Dias", value: pad(timeLeft.days) },
    { label: "Horas", value: pad(timeLeft.hours) },
    { label: "Min", value: pad(timeLeft.minutes) },
    { label: "Seg", value: pad(timeLeft.seconds) },
  ];

  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-lift backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-gold">
        <Clock3 className="h-3.5 w-3.5" />
        Contagem regressiva para 25/05/2026
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border/60 bg-background/85 px-4 py-4 text-center"
          >
            <div className="font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              {item.value}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LandingPage() {
  const tracking = Route.useLoaderData() as Awaited<
    ReturnType<typeof getPublicGlobalTrackingSettings>
  >;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MetaPixelScript pixelId={tracking.pixelId} pageKey="/" />
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(60% 60% at 20% 0%, color-mix(in oklab, var(--gold) 18%, transparent) 0%, transparent 60%), radial-gradient(50% 50% at 90% 20%, color-mix(in oklab, var(--emerald) 18%, transparent) 0%, transparent 60%)",
          }}
        />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24 lg:py-28">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              Pré-lançamento oficial em 25/05/2026
            </div>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              O novo jeito de captar e organizar{" "}
              <span className="italic text-gold">leads imobiliários</span> começa em 25/05.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              No pré-lançamento do LeadLink, imobiliárias e corretores terão acesso antecipado a uma
              estrutura inteligente para transformar visitantes em atendimentos qualificados pelo
              WhatsApp.
            </p>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              O LeadLink nasce como infraestrutura premium para captação, organização e distribuição
              de leads imobiliários, com operação comercial mais clara, rápida e preparada para
              escala.
            </p>
            <div className="mt-8 max-w-2xl">
              <CountdownCard />
            </div>
            <div className="mt-6 flex w-full max-w-xl">
              <a
                href={PRELAUNCH_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
                onClick={() => {
                  trackMetaCustomEvent("WhatsAppClick", { originPath: "landing-prelaunch-top" });
                }}
              >
                <Button
                  size="lg"
                  className="h-12 w-full bg-gold px-6 font-semibold text-navy shadow-lift hover:bg-gold/90 sm:w-auto"
                >
                  Participe do Pré-Lançamento <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald" />
                Acesso antecipado
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald" />
                Operação mais organizada
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald" />
                Grupo exclusivo no WhatsApp
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-gold/20 via-transparent to-emerald/20 blur-2xl" />
            <img
              src={heroImg}
              alt="Painel LeadLink mostrando organização de leads imobiliários"
              width={1920}
              height={1080}
              className="rounded-2xl border border-border/60 shadow-lift"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-border/50 bg-card/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-6 md:px-8">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Pensado para operações imobiliárias premium
          </div>
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3 font-display text-base text-muted-foreground/70">
            <span>Vivenda Boutique</span>
            <span>Costa & Reis</span>
            <span>Atlântico Imóveis</span>
            <span>Casa Nova Realty</span>
            <span>Norte Premium</span>
          </div>
        </div>
      </section>

      <section id="video" className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, var(--navy) 92%, transparent) 0%, transparent 70%), radial-gradient(50% 50% at 80% 100%, color-mix(in oklab, var(--gold) 14%, transparent) 0%, transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-gold">Veja em 90 segundos</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">
              Entenda como o LeadLink{" "}
              <span className="italic text-gold">estrutura sua operação</span>.
            </h2>
            <p className="mt-4 text-muted-foreground md:text-lg">
              Um tour rápido pela estrutura comercial que conecta captação, organização e
              distribuição de leads para imobiliárias e corretores.
            </p>
          </div>

          <div className="relative mt-12">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-gold/25 via-transparent to-emerald/25 blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-navy shadow-lift">
              <div
                className="relative aspect-video w-full"
                style={{
                  background:
                    "radial-gradient(ellipse at 30% 20%, color-mix(in oklab, var(--gold) 22%, transparent) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, color-mix(in oklab, var(--emerald) 22%, transparent) 0%, transparent 55%), linear-gradient(160deg, oklch(0.27 0.045 255), oklch(0.14 0.035 255))",
                }}
              >
                <div
                  className="absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                  <button
                    type="button"
                    aria-label="Vídeo em breve"
                    className="group relative inline-flex h-24 w-24 items-center justify-center rounded-full bg-gold text-navy shadow-[0_20px_60px_-10px_rgba(0,0,0,0.45)] transition-transform hover:scale-105 md:h-28 md:w-28"
                  >
                    <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-gold/40" />
                    <PlayCircle className="h-12 w-12 md:h-14 md:w-14" strokeWidth={1.5} />
                  </button>
                  <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/80 backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
                    Vídeo em breve
                  </div>
                  <p className="mt-4 max-w-md font-display text-base text-white/85 md:text-lg">
                    Em instantes você verá o LeadLink em ação — gravação em fase final.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex justify-center">
            <a
              href={PRELAUNCH_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full max-w-2xl"
              onClick={() => {
                trackMetaCustomEvent("WhatsAppClick", { originPath: "landing-video" });
              }}
            >
              <Button
                size="lg"
                className="h-14 w-full rounded-2xl bg-[linear-gradient(135deg,_color-mix(in_oklab,_var(--gold)_88%,_white),_color-mix(in_oklab,_var(--emerald)_52%,_var(--gold)_48%))] px-6 text-base font-semibold text-navy shadow-[0_22px_60px_-20px_color-mix(in_oklab,var(--gold)_60%,transparent)] transition-transform hover:-translate-y-0.5 hover:brightness-[1.02] md:text-lg"
              >
                Participe do Pré-Lançamento <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section id="recursos" className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs uppercase tracking-[0.25em] text-gold">O que é o LeadLink</div>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">
            Uma infraestrutura inteligente para operar leads com mais precisão.
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Chega de contatos soltos, distribuição confusa e operação fragmentada. O LeadLink
            centraliza captação, triagem, atendimento e acompanhamento comercial em uma estrutura
            premium.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group relative overflow-hidden border-border/60 bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-gold">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="meu-link" className="bg-navy text-navy-foreground">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-2 md:items-center md:px-8 md:py-28">
          <div className="order-2 md:order-1">
            <div className="text-xs uppercase tracking-[0.25em] text-gold">Vitrine inteligente</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">
              Vitrine Personalizada para Cada Corretor
            </h2>
            <p className="mt-4 max-w-xl text-navy-foreground/70 md:text-lg">
              Cada corretor possui sua própria página de imóveis, totalmente personalizável e pronta
              para compartilhar.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-navy-foreground/78 md:text-base">
              Uma estrutura moderna para apresentar imóveis, fortalecer autoridade e transformar
              visitas em atendimentos no WhatsApp.
            </p>
            <ul className="mt-7 grid gap-3 text-sm text-navy-foreground/85 sm:grid-cols-2">
              {[
                "Página exclusiva para cada corretor",
                "Catálogo de imóveis com visual premium",
                "Integração direta com WhatsApp",
                "Ideal para Instagram, anúncios e tráfego pago",
                "Atualização simples e organizada dos imóveis",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex">
              <a
                href={PRELAUNCH_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
                onClick={() => {
                  trackMetaCustomEvent("WhatsAppClick", { originPath: "landing-vitrine" });
                }}
              >
                <Button
                  size="lg"
                  className="h-12 w-full border border-gold/20 bg-gold text-navy shadow-[0_20px_50px_-22px_color-mix(in_oklab,var(--gold)_70%,transparent)] hover:bg-gold/90 sm:w-auto"
                >
                  Participe do Pré-Lançamento <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
          <div className="relative order-1 md:order-2">
            <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_center,_color-mix(in_oklab,_var(--gold)_24%,_transparent),_transparent_70%)] blur-3xl" />
            <img
              src={vitrineTabletImg}
              alt="Vitrine inteligente de imóveis do LeadLink em um tablet"
              width={1400}
              height={1242}
              loading="lazy"
              className="mx-auto w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.55)]"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-full bg-emerald/10 blur-3xl" />
            <img
              src={quizFlowImg}
              alt="Fluxo de quiz inteligente e qualificação de leads no LeadLink"
              width={1024}
              height={1536}
              loading="lazy"
              className="rounded-2xl border border-border/60 shadow-lift"
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-emerald">Quiz inteligente</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">
              Quiz Inteligente que prepara o atendimento antes do primeiro contato
            </h2>
            <p className="mt-4 text-muted-foreground md:text-lg">
              O LeadLink utiliza um sistema de quiz estratégico para filtrar, classificar e
              qualificar cada lead antes dele chegar no WhatsApp do corretor.
            </p>
            <p className="mt-4 text-muted-foreground md:text-lg">
              Durante o fluxo, o sistema identifica automaticamente informações como intenção de
              compra ou locação, faixa de valor, região de interesse, urgência, perfil do imóvel e
              nível de interesse do cliente.
            </p>
            <p className="mt-4 text-muted-foreground md:text-lg">
              Com isso, o corretor recebe um atendimento muito mais organizado, com contexto
              completo da conversa e prioridade definida, reduzindo tempo perdido e aumentando
              significativamente as chances de conversão.
            </p>
            <div className="mt-8 flex">
              <a
                href={PRELAUNCH_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
                onClick={() => {
                  trackMetaCustomEvent("WhatsAppClick", { originPath: "landing-quiz" });
                }}
              >
                <Button
                  size="lg"
                  className="h-12 w-full bg-navy px-6 font-semibold text-navy-foreground shadow-lift hover:bg-navy/90 sm:w-auto"
                >
                  Participe do Pré-Lançamento <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="bg-cream/60">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
          <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-gold">Por que LeadLink</div>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">
                Mais clareza comercial. Mais velocidade. Mais controle.
              </h2>
              <p className="mt-4 text-muted-foreground md:text-lg">
                O pré-lançamento foi pensado para quem quer entrar antes, validar a operação com
                antecedência e posicionar sua imobiliária em um novo padrão de captação e
                organização de leads.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-4 shadow-soft"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald" />
                  <span className="text-sm font-medium">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="pre-lancamento" className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-navy p-10 text-navy-foreground md:p-16">
          <div
            className="absolute inset-0 -z-0 opacity-70"
            style={{
              background:
                "radial-gradient(40% 60% at 80% 0%, color-mix(in oklab, var(--gold) 25%, transparent) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">
                A janela para entrar antes abre em{" "}
                <span className="italic text-gold">25/05/2026</span>.
              </h2>
              <p className="mt-4 max-w-xl text-navy-foreground/75 md:text-lg">
                Participe do pré-lançamento e entre no grupo oficial para acompanhar os primeiros
                acessos, atualizações e movimentações do LeadLink.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
              <a
                href={PRELAUNCH_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackMetaCustomEvent("WhatsAppClick", { originPath: "landing-cta-final" });
                }}
              >
                <Button
                  size="lg"
                  className="h-12 w-full bg-gold font-semibold text-navy shadow-lift hover:bg-gold/90 sm:w-auto"
                >
                  Participe do Pré-Lançamento <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-2.5">
            <img src={leadlinkLogo} alt="LeadLink" className="h-7 w-7 rounded-md object-contain" />
            <span className="font-display text-base font-semibold">LeadLink</span>
            <span className="ml-2 text-xs text-muted-foreground">
              © 2026 — Todos os direitos reservados
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground">
              Termos
            </a>
            <a href="#" className="hover:text-foreground">
              Privacidade
            </a>
            <a href="#" className="hover:text-foreground">
              Contato
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
