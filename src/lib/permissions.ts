import type { PlanLimits, PlanUsage } from "./plans";
import { isAtLimit } from "./plans";

// ─── Verificações de feature ──────────────────────────────────────────────────

export function canCreateProperty(limits: PlanLimits, usage: PlanUsage): boolean {
  return !isAtLimit(usage.propertiesCount, limits.maxProperties);
}

export function canCaptureLead(limits: PlanLimits, usage: PlanUsage): boolean {
  return !isAtLimit(usage.leadsThisMonth, limits.maxLeadsPerMonth);
}

export function canAccessCRM(limits: PlanLimits): boolean {
  return limits.hasCrm;
}

export function canAccessAdvancedDashboard(limits: PlanLimits): boolean {
  return limits.hasAdvancedDashboard;
}

export function canInviteUser(limits: PlanLimits, usage: PlanUsage): boolean {
  return limits.hasTeamManagement && !isAtLimit(usage.usersCount, limits.maxUsers);
}

export function canUseCustomBranding(limits: PlanLimits): boolean {
  return limits.hasCustomBranding;
}

export function canCreateCustomForm(limits: PlanLimits, currentForms: number): boolean {
  return limits.maxCustomForms > 0 && currentForms < limits.maxCustomForms;
}

export function canDistributeLeads(limits: PlanLimits): boolean {
  return limits.hasLeadDistribution;
}

export function canAccessTeamManagement(limits: PlanLimits): boolean {
  return limits.hasTeamManagement;
}

export function hasPrioritySupport(limits: PlanLimits): boolean {
  return limits.hasPrioritySupport;
}

// ─── Verificação genérica de recurso ─────────────────────────────────────────

export type Feature =
  | "crm"
  | "advanced_dashboard"
  | "custom_branding"
  | "team_management"
  | "lead_distribution"
  | "priority_support"
  | "custom_forms";

export function hasFeature(limits: PlanLimits, feature: Feature): boolean {
  switch (feature) {
    case "crm":                return limits.hasCrm;
    case "advanced_dashboard": return limits.hasAdvancedDashboard;
    case "custom_branding":    return limits.hasCustomBranding;
    case "team_management":    return limits.hasTeamManagement;
    case "lead_distribution":  return limits.hasLeadDistribution;
    case "priority_support":   return limits.hasPrioritySupport;
    case "custom_forms":       return limits.maxCustomForms > 0;
    default:                   return false;
  }
}

// ─── Erro de limite de plano (lançado no servidor) ────────────────────────────

export class PlanLimitError extends Error {
  constructor(
    public readonly limitKey: string,
    message: string,
  ) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export function assertCanCreateProperty(limits: PlanLimits, usage: PlanUsage) {
  if (!canCreateProperty(limits, usage)) {
    throw new PlanLimitError(
      "properties_limit",
      `Seu plano permite até ${limits.maxProperties} imóveis. Faça upgrade para cadastrar mais.`,
    );
  }
}

export function assertCanCaptureLead(limits: PlanLimits, usage: PlanUsage) {
  if (!canCaptureLead(limits, usage)) {
    throw new PlanLimitError(
      "leads_limit",
      `Você atingiu o limite de ${limits.maxLeadsPerMonth} leads mensais do seu plano. Faça upgrade para continuar captando.`,
    );
  }
}
