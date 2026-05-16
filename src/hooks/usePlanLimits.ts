import { useQuery } from "@tanstack/react-query";
import { getMyPlanContext } from "@/server-fns/plans";
import {
  getLimitsFromPlan,
  getLimitsFromSlug,
  normalizePlanSlug,
  isAtLimit,
  isNearLimit,
  usagePercent,
  PLAN_LABELS,
} from "@/lib/plans";
import {
  canCreateProperty,
  canCaptureLead,
  canAccessCRM,
  canAccessAdvancedDashboard,
  canInviteUser,
  canUseCustomBranding,
  canDistributeLeads,
  canAccessTeamManagement,
  hasFeature,
} from "@/lib/permissions";
import type { Feature } from "@/lib/permissions";
import type { PlanLimits, PlanUsage } from "@/lib/plans";

const FREE_LIMITS = getLimitsFromSlug("free");
const EMPTY_USAGE: PlanUsage = { propertiesCount: 0, leadsThisMonth: 0, usersCount: 1 };

export function usePlanLimits() {
  const {
    data: ctx,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["plan-context"],
    queryFn: () => getMyPlanContext(),
    staleTime: 60_000, // 1 min — evita re-fetch excessivo
    retry: 1, // tenta 1x depois de falha; não spam servidor
    refetchOnWindowFocus: false, // não re-fetch ao voltar para aba
  });

  // Fallback seguro para Free se erro ou loading
  const limits: PlanLimits = ctx?.plan ? getLimitsFromPlan(ctx.plan) : FREE_LIMITS;
  const usage: PlanUsage = ctx?.usage ?? EMPTY_USAGE;
  const planSlug = normalizePlanSlug(ctx?.plan?.slug ?? null);
  const planName = PLAN_LABELS[planSlug] ?? "Free";
  const subscriptionStatus = ctx?.organization?.subscriptionStatus ?? "free";
  const isPastDue = subscriptionStatus === "past_due";
  const isCanceled = subscriptionStatus === "canceled";
  const isBlocked = isPastDue || isCanceled || !!(planSlug === "free" && ctx?.subscription);
  const hasBlockedLeads = planSlug === "free" && usage.leadsThisMonth > limits.leadsLimit;
  const blockedLeadsCount = Math.max(0, usage.leadsThisMonth - limits.leadsLimit);

  return {
    isLoading,
    isError,
    error,
    limits,
    usage,
    planSlug,
    planName,
    subscriptionStatus,
    plan: ctx?.plan ?? null,
    organization: ctx?.organization ?? null,
    subscription: ctx?.subscription ?? null,
    cancelAtPeriodEnd: Boolean(
      (ctx?.subscription as { cancelAtPeriodEnd?: boolean } | null)?.cancelAtPeriodEnd,
    ),
    hasStripeCustomer: !!ctx?.organization?.stripeCustomerId,
    capabilities: limits,
    isFree: planSlug === "free",
    isPro: planSlug === "pro",
    isComercialIa: planSlug === "comercial_ia",
    isPastDue,
    isCanceled,
    isBlocked,
    canViewLeadDetails: planSlug !== "free" || usage.leadsThisMonth <= limits.leadsLimit,
    hasBlockedLeads,
    blockedLeadsCount,

    // ── Permissões ──────────────────────────────────────────────
    canCreateProperty: canCreateProperty(limits, usage),
    canCaptureLead: canCaptureLead(limits, usage),
    canAccessCRM: canAccessCRM(limits),
    canAccessAdvancedDashboard: canAccessAdvancedDashboard(limits),
    canInviteUser: canInviteUser(limits, usage),
    canUseCustomBranding: canUseCustomBranding(limits),
    canDistributeLeads: canDistributeLeads(limits),
    canAccessTeamManagement: canAccessTeamManagement(limits),
    hasFeature: (feature: Feature) => hasFeature(limits, feature),

    // ── Métricas de uso ─────────────────────────────────────────
    propertiesPercent: usagePercent(usage.propertiesCount, limits.maxProperties),
    leadsPercent: usagePercent(usage.leadsThisMonth, limits.maxLeadsPerMonth),
    usersPercent: usagePercent(usage.usersCount, limits.maxUsers),

    propertiesNearLimit: isNearLimit(usage.propertiesCount, limits.maxProperties),
    leadsNearLimit: isNearLimit(usage.leadsThisMonth, limits.maxLeadsPerMonth),

    propertiesAtLimit: isAtLimit(usage.propertiesCount, limits.maxProperties),
    leadsAtLimit: isAtLimit(usage.leadsThisMonth, limits.maxLeadsPerMonth),
  };
}
