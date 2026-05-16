import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getSession } from "@/server-fns/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  MessageCircle,
  Users,
  LinkIcon,
  Sparkles,
  Zap,
  ShieldCheck,
  BarChart3,
  Calendar,
  Workflow,
  CheckCircle2,
  Building2,
  PlayCircle,
} from "lucide-react";
import leadlinkLogo from "@/assets/leadlink-logo.png";
import heroImg from "@/assets/leadlink-hero.jpg";
import mobileImg from "@/assets/leadlink-mobile.jpg";
import whatsappImg from "@/assets/leadlink-whatsapp.jpg";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (session?.user) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Leadlink — A plataforma premium para corretores de alto padrão" },
      {
        name: "description",
        content:
          "Capture, qualifique e converta leads imobiliários com link inteligente, automações de WhatsApp e CRM premium. Feito para corretores que vendem imóveis de alto padrão.",
      },
      { property: "og:title", content: "Leadlink — Vendas imobiliárias com inteligência" },
      {
        property: "og:description",
        content: "Link inteligente, CRM e automações em uma única plataforma para corretores premium.",
      },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: LinkIcon,
    title: "Meu Link inteligente",
    desc: "Sua bio link premium com quiz de qualificação, vídeos e portfólio de imóveis. Personalizável até o último pixel.",
  },
  {
    icon: MessageCircle,
    title: "Automações no WhatsApp",
    desc: "Mensagens disparadas no momento certo, com o imóvel certo. Nunca mais perca um lead por demora.",
  },
  {
    icon: Users,
    title: "CRM imobiliário completo",
    desc: "Pipeline visual, etiquetas inteligentes e histórico unificado de cada cliente em um só lugar.",
  },
  {
    icon: Calendar,
    title: "Agenda integrada",
    desc: "Visitas, follow-ups e compromissos sincronizados com lembretes automáticos para você e o cliente.",
  },
  {
    icon: BarChart3,
    title: "Relatórios de performance",
    desc: "Saiba de onde vêm seus melhores leads, taxa de conversão por etapa e quanto cada canal traz de receita.",
  },
  {
    icon: Workflow,
    title: "Fluxos sob medida",
    desc: "Crie automações personalizadas para nutrir, qualificar e reativar contatos sem mover um dedo.",
  },
];

const benefits = [
  "Mais leads qualificados todos os dias",
  "Resposta em segundos, 24/7",
  "Imóveis enviados automaticamente no perfil do cliente",
  "Visão clara de cada negociação aberta",
  "Marca pessoal premium em um link só",
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={leadlinkLogo} alt="Leadlink" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-display text-xl font-semibold tracking-tight">Leadlink</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#video" className="hover:text-foreground transition-colors">Vídeo</a>
            <a href="#meu-link" className="hover:text-foreground transition-colors">Meu Link</a>
            <a href="#beneficios" className="hover:text-foreground transition-colors">Benefícios</a>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" className="text-sm">Login</Button>
            </Link>
            <Link to="/login">
              <Button className="bg-navy text-navy-foreground hover:bg-navy/90 text-sm shadow-elegant">
                Registre-se <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(60% 60% at 20% 0%, color-mix(in oklab, var(--gold) 18%, transparent) 0%, transparent 60%), radial-gradient(50% 50% at 90% 20%, color-mix(in oklab, var(--emerald) 18%, transparent) 0%, transparent 60%)",
          }}
        />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-2 md:py-24 md:px-8 lg:py-28">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              Plataforma premium para corretores de alto padrão
            </div>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Transforme cada clique em uma <span className="italic text-gold">venda imobiliária</span>.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Leadlink é a plataforma all-in-one que une seu link inteligente, CRM e automações de WhatsApp em um só lugar — feita para corretores que querem vender mais com menos esforço.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login">
                <Button size="lg" className="h-12 bg-gold text-navy hover:bg-gold/90 px-6 font-semibold shadow-lift">
                  Começar agora <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-12 px-6">
                  Já tenho conta
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald" /> Sem cartão de crédito</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald" /> Configuração em 5 minutos</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald" /> Suporte humano</div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-gold/20 via-transparent to-emerald/20 blur-2xl" />
            <img
              src={heroImg}
              alt="Painel Leadlink mostrando pipeline de leads imobiliários"
              width={1920}
              height={1080}
              className="rounded-2xl border border-border/60 shadow-lift"
            />
          </div>
        </div>
      </section>

      {/* Logos / social proof strip */}
      <section className="border-y border-border/50 bg-card/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-6 md:px-8">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Confiado por imobiliárias premium</div>
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3 font-display text-base text-muted-foreground/70">
            <span>Vivenda Boutique</span>
            <span>Costa & Reis</span>
            <span>Atlântico Imóveis</span>
            <span>Casa Nova Realty</span>
            <span>Norte Premium</span>
          </div>
        </div>
      </section>

      {/* Video showcase — placeholder reservado */}
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
              Entenda como o Leadlink <span className="italic text-gold">vende por você</span>.
            </h2>
            <p className="mt-4 text-muted-foreground md:text-lg">
              Um tour rápido pela plataforma — do link inteligente ao fechamento no WhatsApp. Aperte o play e veja na prática.
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
                {/* grid sutil */}
                <div
                  className="absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
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
                    Em instantes você verá o Leadlink em ação — gravando agora.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is Leadlink */}
      <section id="recursos" className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs uppercase tracking-[0.25em] text-gold">O que é o Leadlink</div>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">
            Tudo o que um corretor precisa, em uma plataforma só.
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Chega de planilhas, contatos perdidos no WhatsApp e link de bio sem identidade. O Leadlink centraliza captura, qualificação, atendimento e fechamento.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="group relative overflow-hidden border-border/60 bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-gold">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Meu Link feature spotlight */}
      <section id="meu-link" className="bg-navy text-navy-foreground">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-2 md:items-center md:px-8 md:py-28">
          <div className="order-2 md:order-1">
            <div className="text-xs uppercase tracking-[0.25em] text-gold">Meu Link</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">
              A bio link mais elegante do mercado imobiliário.
            </h2>
            <p className="mt-4 max-w-xl text-navy-foreground/70 md:text-lg">
              Um link só com seu portfólio de imóveis, vídeos, depoimentos e um quiz inteligente que qualifica o cliente antes mesmo dele chegar no seu WhatsApp.
            </p>
            <ul className="mt-7 space-y-3 text-sm text-navy-foreground/85">
              {[
                "Personalize cores, fontes, gradientes e formatos",
                "Quiz integrado com envio direto para o WhatsApp",
                "Blocos de vídeo, fotos e CTA com captura de lead",
                "Domínio próprio leadlink.app/seu-nome",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-gold" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link to="/login">
                <Button size="lg" className="bg-gold text-navy hover:bg-gold/90 font-semibold">
                  Criar meu link <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative order-1 md:order-2">
            <div className="absolute -inset-8 -z-10 rounded-full bg-gold/10 blur-3xl" />
            <img
              src={mobileImg}
              alt="Página Meu Link em um celular"
              width={1024}
              height={1024}
              loading="lazy"
              className="mx-auto max-w-sm rounded-3xl border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* WhatsApp automation spotlight */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-full bg-emerald/10 blur-3xl" />
            <img
              src={whatsappImg}
              alt="Automação no WhatsApp enviando imóveis"
              width={1024}
              height={1024}
              loading="lazy"
              className="rounded-2xl border border-border/60 shadow-lift"
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-emerald">Automações</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">
              Atendimento de elite, mesmo enquanto você dorme.
            </h2>
            <p className="mt-4 text-muted-foreground md:text-lg">
              O Leadlink responde no WhatsApp em segundos, faz a triagem do perfil do cliente, envia os imóveis ideais e marca a visita direto na sua agenda — você só entra na conversa quando o lead já está aquecido.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {[
                { icon: Zap, t: "Resposta em 5s" },
                { icon: ShieldCheck, t: "Sem perder lead" },
                { icon: Users, t: "Triagem inteligente" },
                { icon: Calendar, t: "Visitas agendadas" },
              ].map((i) => (
                <div key={i.t} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
                    <i.icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-sm font-medium">{i.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits / Why */}
      <section id="beneficios" className="bg-cream/60">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
          <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-gold">Por que Leadlink</div>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">
                Mais vendas. Menos esforço. Marca premium.
              </h2>
              <p className="mt-4 text-muted-foreground md:text-lg">
                Corretores que usam Leadlink relatam até <span className="font-semibold text-foreground">3x mais leads qualificados</span> e <span className="font-semibold text-foreground">40% menos tempo</span> em tarefas manuais.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-4 shadow-soft">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald" />
                  <span className="text-sm font-medium">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="planos" className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
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
                Pronto para vender como uma <span className="italic text-gold">imobiliária boutique?</span>
              </h2>
              <p className="mt-4 max-w-xl text-navy-foreground/75 md:text-lg">
                Link inteligente
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
              <Link to="/login">
                <Button size="lg" className="h-12 w-full bg-gold text-navy hover:bg-gold/90 font-semibold sm:w-auto">
                  Registre-se grátis <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-12 w-full border-white/20 bg-white/5 text-navy-foreground hover:bg-white/10 sm:w-auto">
                  Fazer login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-2.5">
            <img src={leadlinkLogo} alt="Leadlink" className="h-7 w-7 rounded-md object-contain" />
            <span className="font-display text-base font-semibold">Leadlink</span>
            <span className="ml-2 text-xs text-muted-foreground">© 2026 — Todos os direitos reservados</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground">Termos</a>
            <a href="#" className="hover:text-foreground">Privacidade</a>
            <a href="#" className="hover:text-foreground">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
