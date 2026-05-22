import type { User, Plan } from "@/db/schema";

export const PLAN_SLUGS = ["free", "pro", "comercial", "comercial_ia"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

export type PlanCapabilities = {
  leadsLimit: number;
  propertiesLimit: number;
  maxLeadsPerMonth: number;
  maxProperties: number;
  canEditQuiz: boolean;
  canUseBackgroundImage: boolean;
  canUseVideos: boolean;
  canUseExtension: boolean;
  hasAiAssistant: boolean;
  maxUsers: number;
  maxCustomForms: number;
  hasCrm: boolean;
  hasAdvancedDashboard: boolean;
  hasCustomBranding: boolean;
  hasCustomDomain: boolean;
  hasTeamManagement: boolean;
  hasLeadDistribution: boolean;
  hasPrioritySupport: boolean;
  showLeadlinkBranding: boolean;
};

export type PlanLimits = PlanCapabilities;
export type PlanUsage = {
  propertiesCount: number;
  leadsThisMonth: number;
  usersCount: number;
};

export type PlanContext = {
  plan: { slug: string } | null;
  organization: { stripeCustomerId: string | null; subscriptionStatus?: string } | null;
  subscription: unknown | null;
  usage: PlanUsage;
};

export const PLAN_CAPABILITIES: Record<PlanSlug, PlanCapabilities> = {
  free: {
    leadsLimit: 15,
    propertiesLimit: 3,
    canEditQuiz: false,
    canUseBackgroundImage: false,
    canUseVideos: false,
    canUseExtension: false,
    hasAiAssistant: false,
    maxLeadsPerMonth: 15,
    maxProperties: 3,
    maxUsers: 1,
    maxCustomForms: 0,
    hasCrm: false,
    hasAdvancedDashboard: false,
    hasCustomBranding: false,
    hasCustomDomain: false,
    hasTeamManagement: false,
    hasLeadDistribution: false,
    hasPrioritySupport: false,
    showLeadlinkBranding: true,
  },
  pro: {
    leadsLimit: 500,
    propertiesLimit: 50,
    canEditQuiz: true,
    canUseBackgroundImage: true,
    canUseVideos: true,
    canUseExtension: true,
    hasAiAssistant: false,
    maxLeadsPerMonth: 500,
    maxProperties: 50,
    maxUsers: 1,
    maxCustomForms: 3,
    hasCrm: true,
    hasAdvancedDashboard: false,
    hasCustomBranding: true,
    hasCustomDomain: true,
    hasTeamManagement: false,
    hasLeadDistribution: false,
    hasPrioritySupport: false,
    showLeadlinkBranding: false,
  },
  comercial_ia: {
    leadsLimit: 5000,
    propertiesLimit: 500,
    canEditQuiz: true,
    canUseBackgroundImage: true,
    canUseVideos: true,
    canUseExtension: true,
    hasAiAssistant: true,
    maxLeadsPerMonth: 5000,
    maxProperties: 500,
    maxUsers: 15,
    maxCustomForms: 20,
    hasCrm: true,
    hasAdvancedDashboard: true,
    hasCustomBranding: true,
    hasCustomDomain: true,
    hasTeamManagement: true,
    hasLeadDistribution: true,
    hasPrioritySupport: true,
    showLeadlinkBranding: false,
  },
  comercial: {
    leadsLimit: 5000,
    propertiesLimit: 500,
    canEditQuiz: true,
    canUseBackgroundImage: true,
    canUseVideos: true,
    canUseExtension: true,
    hasAiAssistant: true,
    maxLeadsPerMonth: 5000,
    maxProperties: 500,
    maxUsers: 15,
    maxCustomForms: 20,
    hasCrm: true,
    hasAdvancedDashboard: true,
    hasCustomBranding: true,
    hasCustomDomain: true,
    hasTeamManagement: true,
    hasLeadDistribution: true,
    hasPrioritySupport: true,
    showLeadlinkBranding: false,
  },
};

export function normalizePlanSlug(planSlug?: string | null): PlanSlug {
  const normalized = typeof planSlug === "string" ? planSlug.trim().toLowerCase() : "";
  if (normalized === "pro") return "pro";
  if (normalized === "comercial" || normalized === "comercial_ia") return "comercial_ia";
  return "free";
}

export function getEffectivePlanSlug(input:
  | {
      planSlug?: string | null;
      organizationPlanSlug?: string | null;
    }
  | null
  | undefined,
) {
  const organizationPlanSlug = input?.organizationPlanSlug;
  if (organizationPlanSlug) return normalizePlanSlug(organizationPlanSlug);
  return normalizePlanSlug(input?.planSlug);
}

export function getPlanCapabilities(planSlug?: string | null): PlanCapabilities {
  return PLAN_CAPABILITIES[normalizePlanSlug(planSlug)];
}

export function getUserPlan(
  user:
    | (Pick<User, "planSlug" | "planStatus" | "planAcquiredAt" | "planExpiresAt"> & {
        organizationPlanSlug?: string | null;
        organizationSubscriptionStatus?: string | null;
      })
    | null
    | undefined,
) {
  const planSlug = getEffectivePlanSlug(user);
  const planStatus =
    user?.organizationSubscriptionStatus ??
    user?.planStatus ??
    "free";
  return {
    planSlug,
    planStatus,
    acquiredAt: user?.planAcquiredAt ?? null,
    expiresAt: user?.planExpiresAt ?? null,
    capabilities: getPlanCapabilities(planSlug),
  };
}

export type ProfileCompleteness = {
  percentage: number;
  missingFields: string[];
};

export function calculateProfileCompleteness(profile: Partial<User>): ProfileCompleteness {
  const fields: Array<
    [
      keyof Pick<
        User,
        | "displayName"
        | "bio"
        | "creci"
        | "avatarUrl"
        | "coverImageUrl"
        | "specialty"
        | "yearsExperience"
        | "city"
        | "state"
        | "instagramUrl"
        | "whatsappNumber"
        | "websiteUrl"
        | "cpfCnpj"
        | "billingName"
        | "billingEmail"
        | "billingAddressLine1"
        | "billingAddressCity"
        | "billingAddressState"
        | "billingAddressZip"
      >,
      string,
    ]
  > = [
    ["displayName", "Nome público"],
    ["bio", "Bio"],
    ["creci", "CRECI"],
    ["avatarUrl", "Foto/avatar URL"],
    ["coverImageUrl", "Foto de capa URL"],
    ["specialty", "Especialidades"],
    ["yearsExperience", "Anos de experiência"],
    ["city", "Cidade"],
    ["state", "Estado"],
    ["instagramUrl", "Instagram"],
    ["whatsappNumber", "WhatsApp"],
    ["websiteUrl", "Website"],
    ["cpfCnpj", "CPF/CNPJ"],
    ["billingName", "Nome para cobrança"],
    ["billingEmail", "Email de cobrança"],
    ["billingAddressLine1", "Endereço"],
    ["billingAddressCity", "Cidade de cobrança"],
    ["billingAddressState", "Estado de cobrança"],
    ["billingAddressZip", "CEP"],
  ];

  const missingFields = fields
    .filter(([field]) => {
      const value = profile[field];
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === "number") return !Number.isFinite(value);
      return typeof value === "string" ? value.trim().length === 0 : !value;
    })
    .map(([, label]) => label);

  const filled = fields.filter(([field]) => {
    const value = profile[field];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number") return Number.isFinite(value);
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  }).length;

  return {
    percentage: Math.round((filled / fields.length) * 100),
    missingFields,
  };
}

export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export function assertCanCreateProperty(
  user:
    | (Pick<User, "planSlug"> & { organizationPlanSlug?: string | null })
    | null
    | undefined,
  currentPropertyCount: number,
) {
  const capabilities = getPlanCapabilities(getEffectivePlanSlug(user));
  if (currentPropertyCount >= capabilities.propertiesLimit) {
    throw new PlanLimitError("Você atingiu o limite do plano Free.");
  }
}

export type LeadVisibility = {
  isBlocked: boolean;
  masked: boolean;
};

export function getLeadVisibilityForUser(
  user:
    | (Pick<User, "planSlug"> & { organizationPlanSlug?: string | null })
    | null
    | undefined,
  leadIndex: number,
): LeadVisibility {
  const planSlug = getEffectivePlanSlug(user);
  const capabilities = getPlanCapabilities(planSlug);
  const masked = planSlug === "free" && leadIndex >= capabilities.leadsLimit;
  return { isBlocked: masked, masked };
}

export type PlanRecord = Plan & { slug: PlanSlug };

export const PLAN_DEFAULTS = PLAN_CAPABILITIES;
export const PLAN_LABELS: Record<PlanSlug, string> = {
  free: "Free",
  pro: "Pro",
  comercial: "Comercial IA",
  comercial_ia: "Comercial IA",
};

export type PublicPlanCard = {
  slug: PlanSlug;
  name: string;
  description: string;
  priceMonthly: number;
  setupFee: number;
  isActive: boolean;
  maxUsers: number;
  maxProperties: number;
  maxLeadsPerMonth: number;
  maxCustomForms: number;
  hasCrm: boolean;
  hasAdvancedDashboard: boolean;
  hasCustomBranding: boolean;
  hasCustomDomain: boolean;
  hasTeamManagement: boolean;
  hasLeadDistribution: boolean;
  hasPrioritySupport: boolean;
  showLeadlinkBranding: boolean;
};

export const PLAN_PUBLIC_CATALOG: PublicPlanCard[] = [
  {
    slug: "free",
    name: "Free",
    description: "Comece sem custo e valide seu fluxo de leads.",
    priceMonthly: 0,
    setupFee: 0,
    isActive: true,
    maxUsers: 1,
    maxProperties: 3,
    maxLeadsPerMonth: 15,
    maxCustomForms: 0,
    hasCrm: false,
    hasAdvancedDashboard: false,
    hasCustomBranding: false,
    hasCustomDomain: false,
    hasTeamManagement: false,
    hasLeadDistribution: false,
    hasPrioritySupport: false,
    showLeadlinkBranding: true,
  },
  {
    slug: "pro",
    name: "Pro",
    description: "Para corretores que precisam crescer com organização.",
    priceMonthly: 9700,
    setupFee: 0,
    isActive: true,
    maxUsers: 1,
    maxProperties: 50,
    maxLeadsPerMonth: 500,
    maxCustomForms: 3,
    hasCrm: true,
    hasAdvancedDashboard: false,
    hasCustomBranding: true,
    hasCustomDomain: true,
    hasTeamManagement: false,
    hasLeadDistribution: false,
    hasPrioritySupport: true,
    showLeadlinkBranding: false,
  },
  {
    slug: "comercial_ia",
    name: "Comercial IA",
    description: "IA de atendimento para escalar conversas e agendamentos.",
    priceMonthly: 49700,
    setupFee: 0,
    isActive: true,
    maxUsers: 15,
    maxProperties: 500,
    maxLeadsPerMonth: 5000,
    maxCustomForms: 20,
    hasCrm: true,
    hasAdvancedDashboard: true,
    hasCustomBranding: true,
    hasCustomDomain: true,
    hasTeamManagement: true,
    hasLeadDistribution: true,
    hasPrioritySupport: true,
    showLeadlinkBranding: false,
  },
];

export const UPGRADE_MESSAGES: Record<
  string,
  { title: string; description: string; targetPlan: PlanSlug }
> = {
  properties_limit: {
    title: "Limite de imóveis atingido",
    description: "Faça upgrade para cadastrar mais imóveis e ampliar sua vitrine.",
    targetPlan: "pro",
  },
  leads_limit: {
    title: "Limite de leads mensais atingido",
    description: "Continue captando leads sem interrupção com um plano superior.",
    targetPlan: "pro",
  },
};

export function getLimitsFromSlug(slug: string) {
  return getPlanCapabilities(slug);
}

export function getLimitsFromPlan(plan: { slug: string }) {
  return getPlanCapabilities(plan.slug);
}

export function formatPrice(cents: number): string {
  if (cents === 0) return "Grátis";
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function usagePercent(used: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}

export function isNearLimit(used: number, max: number, threshold = 0.8): boolean {
  return max > 0 && used / max >= threshold;
}

export function isAtLimit(used: number, max: number): boolean {
  return max > 0 && used >= max;
}
