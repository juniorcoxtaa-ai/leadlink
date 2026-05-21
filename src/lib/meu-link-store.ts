import {
  saveMeuLinkConfig,
  getMeuLinkConfig,
  loadMeuLinkConfig,
  getMySlug,
} from "@/server-fns/meu-link";
import {
  DEFAULT_QUIZ_BLOCKS,
  sanitizeBlockQuestions,
  type QuizBlocks,
  type QuizQuestion,
} from "@/lib/quiz-blocks";
import {
  DEFAULT_VITRINE_CONFIG,
  normalizeVitrineConfig,
  type VitrineConfig,
} from "@/lib/vitrine-config";
import { uploadPropertyImage } from "@/lib/property-storage";

export type Stat = { id: string; label: string; value: string };
export type LinkItem = { id: string; label: string; url: string; enabled: boolean };
export type VideoBlock = { id: string; title: string; url: string; enabled: boolean };
export type QuestionType = "text" | "tel" | "email" | "select" | "number";
export type Question = {
  id: string;
  label: string;
  placeholder?: string;
  type: QuestionType;
  required: boolean;
  locked?: boolean;
  enabled: boolean;
  options?: string[];
};

export type BgStyle =
  | "paper"
  | "navy"
  | "gradient"
  | "image"
  | "noir"
  | "sunset"
  | "aurora"
  | "mesh";
export type Accent = "emerald" | "navy" | "gold" | "rose" | "violet" | "charcoal" | "sand";
export type FontStyle = "editorial" | "modern" | "mono";
export type BtnShape = "pill" | "rounded" | "square";

const FIXED_LINK_LABELS = new Set([
  "vitrine de imoveis",
  "falar comigo agora",
  "quiz",
  "imoveis em destaque",
]);

const FIXED_LINK_HREF_PATTERNS = [/^\/imoveis\/?$/i, /^\/quiz\/?$/i, /^\/l\/[^/]+\/vitrine\/?$/i];

export type MeuLinkConfig = {
  name: string;
  subtitle: string;
  bio: string;
  city: string;
  whatsapp: string;
  slug: string;
  verified: boolean;
  ctaText: string;
  photoUrl: string;
  accent: Accent;
  bgStyle: BgStyle;
  bgImage: string;
  font: FontStyle;
  btnShape: BtnShape;
  glass: boolean;
  stats: Stat[];
  links: LinkItem[];
  videos: VideoBlock[];
  quizBlocks: QuizBlocks;
  quizIntro: string;
  featuredIds: string[];
  vitrine: VitrineConfig;
};

export const MANDATORY: Question[] = [
  {
    id: "q-name",
    label: "Nome completo",
    placeholder: "Como podemos te chamar?",
    type: "text",
    required: true,
    locked: true,
    enabled: true,
  },
  {
    id: "q-phone",
    label: "Telefone / WhatsApp",
    placeholder: "(11) 99999-0000",
    type: "tel",
    required: true,
    locked: true,
    enabled: true,
  },
  {
    id: "q-city",
    label: "Cidade onde quer morar",
    placeholder: "Ex.: São Paulo - Pinheiros",
    type: "text",
    required: true,
    locked: true,
    enabled: true,
  },
];

export const DEFAULT_OPTIONAL: Question[] = [
  {
    id: "q-goal",
    label: "Você quer comprar, alugar ou investir?",
    type: "select",
    required: false,
    enabled: true,
    options: ["Comprar", "Alugar", "Investir"],
  },
  {
    id: "q-type",
    label: "Tipo de imóvel preferido",
    type: "select",
    required: false,
    enabled: true,
    options: ["Apartamento", "Casa", "Cobertura", "Studio", "Comercial"],
  },
  {
    id: "q-budget",
    label: "Faixa de investimento",
    type: "select",
    required: false,
    enabled: true,
    options: ["Até R$ 500 mil", "R$ 500 mil – R$ 1 mi", "R$ 1 mi – R$ 3 mi", "Acima de R$ 3 mi"],
  },
  {
    id: "q-bedrooms",
    label: "Quantos dormitórios?",
    type: "select",
    required: false,
    enabled: true,
    options: ["1", "2", "3", "4 ou mais"],
  },
  {
    id: "q-when",
    label: "Quando pretende mudar?",
    type: "select",
    required: false,
    enabled: true,
    options: ["Agora", "Em até 3 meses", "Em até 6 meses", "Sem pressa"],
  },
  {
    id: "q-financing",
    label: "Vai usar financiamento?",
    type: "select",
    required: false,
    enabled: false,
    options: ["Sim", "Não", "Talvez"],
  },
  {
    id: "q-fgts",
    label: "Pretende usar FGTS?",
    type: "select",
    required: false,
    enabled: false,
    options: ["Sim", "Não"],
  },
  {
    id: "q-notes",
    label: "Algo importante que devemos saber?",
    type: "text",
    required: false,
    enabled: false,
  },
];

export const DEFAULT_CONFIG: MeuLinkConfig = {
  name: "Junior Costa",
  subtitle: "Especialista em alto padrão",
  bio: "Conectando pessoas aos imóveis dos sonhos em Ipaussu e região.",
  city: "Ipaussu, SP",
  whatsapp: "(14) 99999-1234",
  slug: "junior-costa",
  verified: true,
  ctaText: "Falar comigo agora",
  photoUrl: "",
  accent: "emerald",
  bgStyle: "paper",
  bgImage: "",
  font: "editorial",
  btnShape: "pill",
  glass: true,
  stats: [
    { id: "1", label: "Clientes atendidos", value: "240+" },
    { id: "2", label: "Avaliação média", value: "4.9★" },
    { id: "3", label: "Anos de experiência", value: "8" },
  ],
  links: [
    { id: "1", label: "Imóveis em destaque", url: "/imoveis", enabled: true },
    { id: "2", label: "Quiz: encontre seu imóvel", url: "/quiz", enabled: true },
    { id: "3", label: "Instagram", url: "https://instagram.com/junior", enabled: true },
  ],
  videos: [],
  quizBlocks: DEFAULT_QUIZ_BLOCKS,
  quizIntro: "Em 30 segundos eu encontro o imóvel ideal pra você.",
  featuredIds: [],
  vitrine: DEFAULT_VITRINE_CONFIG,
};

export const EMPTY_MEU_LINK_CONFIG: MeuLinkConfig = {
  name: "",
  subtitle: "",
  bio: "",
  city: "",
  whatsapp: "",
  slug: "",
  verified: false,
  ctaText: "",
  photoUrl: "",
  accent: "emerald",
  bgStyle: "paper",
  bgImage: "",
  font: "editorial",
  btnShape: "pill",
  glass: true,
  stats: [],
  links: [],
  videos: [],
  quizBlocks: DEFAULT_QUIZ_BLOCKS,
  quizIntro: "",
  featuredIds: [],
  vitrine: DEFAULT_VITRINE_CONFIG,
};

export function sanitizeCustomLinks(links: LinkItem[] | undefined, slug = ""): LinkItem[] {
  const normalizedSlug = slug.trim().toLowerCase();
  return (links ?? []).filter((link) => {
    const label = String(link.label ?? "")
      .trim()
      .toLowerCase();
    const normalizedLabel = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (FIXED_LINK_LABELS.has(normalizedLabel)) return false;
    const href = String(link.url ?? "").trim();
    if (FIXED_LINK_HREF_PATTERNS.some((pattern) => pattern.test(href))) return false;
    if (normalizedSlug && href === `/l/${normalizedSlug}/vitrine`) return false;
    return true;
  });
}

/* ============================================================
 * Tema visual — paletas e tokens reutilizáveis (preview + público)
 * ============================================================ */

export const ACCENT_TOKENS: Record<
  Accent,
  { bg: string; fg: string; soft: string; ring: string; label: string }
> = {
  emerald: {
    bg: "oklch(0.45 0.08 175)",
    fg: "#fff",
    soft: "oklch(0.45 0.08 175 / 0.18)",
    ring: "oklch(0.45 0.08 175 / 0.4)",
    label: "Esmeralda",
  },
  navy: {
    bg: "oklch(0.235 0.04 255)",
    fg: "#fff",
    soft: "oklch(0.235 0.04 255 / 0.18)",
    ring: "oklch(0.235 0.04 255 / 0.4)",
    label: "Navy",
  },
  gold: {
    bg: "oklch(0.7 0.09 75)",
    fg: "oklch(0.235 0.04 255)",
    soft: "oklch(0.7 0.09 75 / 0.2)",
    ring: "oklch(0.7 0.09 75 / 0.45)",
    label: "Ouro",
  },
  rose: {
    bg: "oklch(0.62 0.16 15)",
    fg: "#fff",
    soft: "oklch(0.62 0.16 15 / 0.2)",
    ring: "oklch(0.62 0.16 15 / 0.4)",
    label: "Rosê",
  },
  violet: {
    bg: "oklch(0.45 0.16 295)",
    fg: "#fff",
    soft: "oklch(0.45 0.16 295 / 0.2)",
    ring: "oklch(0.45 0.16 295 / 0.4)",
    label: "Violeta",
  },
  charcoal: {
    bg: "oklch(0.22 0.005 260)",
    fg: "#fff",
    soft: "oklch(0.22 0.005 260 / 0.2)",
    ring: "oklch(0.22 0.005 260 / 0.4)",
    label: "Carvão",
  },
  sand: {
    bg: "oklch(0.78 0.06 70)",
    fg: "oklch(0.235 0.04 255)",
    soft: "oklch(0.78 0.06 70 / 0.25)",
    ring: "oklch(0.78 0.06 70 / 0.45)",
    label: "Areia",
  },
};

export const BG_PRESETS: Record<
  Exclude<BgStyle, "image">,
  { label: string; preview: string; isDark: boolean }
> = {
  paper: {
    label: "Papel",
    preview:
      "radial-gradient(circle at 20% 0%, oklch(0.7 0.09 75 / 0.18), transparent 50%), radial-gradient(circle at 90% 100%, oklch(0.45 0.08 175 / 0.14), transparent 50%), oklch(0.97 0.012 85)",
    isDark: false,
  },
  navy: {
    label: "Navy",
    preview: "linear-gradient(160deg, oklch(0.27 0.045 255), oklch(0.16 0.035 255))",
    isDark: true,
  },
  gradient: {
    label: "Aurora suave",
    preview:
      "linear-gradient(135deg, oklch(0.45 0.08 175 / 0.18), oklch(0.97 0.012 85) 50%, oklch(0.7 0.09 75 / 0.22))",
    isDark: false,
  },
  noir: {
    label: "Noir",
    preview: "radial-gradient(ellipse at 50% 0%, oklch(0.25 0.01 260), oklch(0.08 0.005 260) 80%)",
    isDark: true,
  },
  sunset: {
    label: "Sunset",
    preview:
      "linear-gradient(160deg, oklch(0.7 0.18 35), oklch(0.55 0.2 350) 60%, oklch(0.32 0.12 290))",
    isDark: true,
  },
  aurora: {
    label: "Aurora",
    preview:
      "radial-gradient(ellipse at 20% 10%, oklch(0.55 0.18 165 / 0.55), transparent 55%), radial-gradient(ellipse at 80% 90%, oklch(0.5 0.18 285 / 0.55), transparent 55%), oklch(0.18 0.04 260)",
    isDark: true,
  },
  mesh: {
    label: "Mesh",
    preview:
      "radial-gradient(at 0% 0%, oklch(0.85 0.12 80), transparent 50%), radial-gradient(at 100% 0%, oklch(0.78 0.13 25), transparent 50%), radial-gradient(at 100% 100%, oklch(0.7 0.14 320), transparent 50%), radial-gradient(at 0% 100%, oklch(0.78 0.12 200), transparent 50%), oklch(0.97 0.012 85)",
    isDark: false,
  },
};

export const FONT_FAMILIES: Record<FontStyle, { label: string; family: string }> = {
  editorial: {
    label: "Editorial (serif)",
    family: 'Fraunces, "Cormorant Garamond", Georgia, serif',
  },
  modern: { label: "Moderno (sans)", family: "Inter, system-ui, sans-serif" },
  mono: { label: "Mono (técnico)", family: '"JetBrains Mono", ui-monospace, monospace' },
};

export const BTN_RADIUS: Record<BtnShape, string> = {
  pill: "9999px",
  rounded: "14px",
  square: "4px",
};

/* ============================================================
 * Vídeo — embed helpers (YouTube + Vimeo)
 * ============================================================ */

export function toVideoEmbed(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return url;
  } catch {
    return null;
  }
}

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "network" | "unknown"; message: string };

export async function saveConfig(cfg: MeuLinkConfig): Promise<SaveResult> {
  try {
    await saveMeuLinkConfig({
      data: {
        slug: cfg.slug,
        config: {
          ...cfg,
          links: sanitizeCustomLinks(cfg.links, cfg.slug),
          quizBlocks: sanitizeQuizBlocks(cfg.quizBlocks ?? DEFAULT_QUIZ_BLOCKS),
        },
      },
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: "unknown",
      message: e instanceof Error ? e.message : "Falha ao salvar.",
    };
  }
}

export async function loadConfig(slug?: string): Promise<MeuLinkConfig> {
  try {
    if (slug) {
      const data = await loadMeuLinkConfig({ data: slug });
      if (!data) return EMPTY_MEU_LINK_CONFIG;
      return normalizeMeuLinkConfig(data, slug);
    }
    const mySlug = await getMySlug();
    if (!mySlug) return EMPTY_MEU_LINK_CONFIG;
    const data = await getMeuLinkConfig();
    if (!data) return EMPTY_MEU_LINK_CONFIG;
    return normalizeMeuLinkConfig(data, mySlug);
  } catch {
    return EMPTY_MEU_LINK_CONFIG;
  }
}

export function normalizeMeuLinkConfig(
  data: Partial<MeuLinkConfig>,
  fallbackSlug = "",
): MeuLinkConfig {
  const slug = data.slug?.trim() || fallbackSlug;
  return {
    ...EMPTY_MEU_LINK_CONFIG,
    ...data,
    stats: data.stats ?? [],
    links: sanitizeCustomLinks(data.links ?? [], slug),
    videos: data.videos ?? [],
    quizBlocks: sanitizeQuizBlocks(
      normalizeQuizBlocks(
        (data as Partial<{ quizBlocks: QuizBlocks }>).quizBlocks,
        (data as Partial<{ questions: QuizQuestion[] }>).questions,
      ),
    ),
    featuredIds: data.featuredIds ?? [],
    vitrine: normalizeVitrineConfig(data.vitrine),
    slug,
  };
}

function normalizeQuizBlocks(blocks?: QuizBlocks, legacyQuestions?: QuizQuestion[]): QuizBlocks {
  if (blocks) return blocks;
  if (legacyQuestions?.length) return DEFAULT_QUIZ_BLOCKS;
  return DEFAULT_QUIZ_BLOCKS;
}

function sanitizeQuizBlocks(blocks: QuizBlocks): QuizBlocks {
  return {
    locacao: { ...blocks.locacao, questions: sanitizeQuestions(blocks.locacao.questions) },
    compra: { ...blocks.compra, questions: sanitizeQuestions(blocks.compra.questions) },
    investimento: {
      ...blocks.investimento,
      questions: sanitizeQuestions(blocks.investimento.questions),
    },
  };
}

function sanitizeQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  return questions
    .filter((q) => q.label.trim().length > 0)
    .map((q) => ({
      ...q,
      options:
        q.type === "select" ? (q.options ?? []).filter((opt) => opt.trim().length > 0) : q.options,
    }));
}

/**
 * Comprime e faz upload de uma imagem para o bucket "meu-link".
 * Retorna a URL pública.
 */
export async function uploadImage(
  file: File,
  slug: string,
  kind: "photo" | "bg",
  opts: { maxDim?: number; quality?: number } = {},
): Promise<string> {
  const { maxDim = kind === "bg" ? 1600 : 512, quality = 0.85 } = opts;
  const blob = await compressImage(file, maxDim, quality);
  const uploadFile = new File([blob], file.name || `${kind}.jpg`, {
    type: blob.type || "image/jpeg",
  });
  return uploadPropertyImage(uploadFile, {
    userId: slug || "meu-link",
    propertyId: slug || "meu-link",
    isPrimary: kind === "photo",
  });
}

async function compressImage(file: File, maxDim: number, quality: number): Promise<Blob> {
  const dataUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas indisponível"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (b) => {
          URL.revokeObjectURL(dataUrl);
          return b ? resolve(b) : reject(new Error("Falha ao comprimir"));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(dataUrl);
      reject(new Error("Falha ao processar imagem"));
    };
    img.src = dataUrl;
  });
}
