import type { LeadStatus } from "./lead-constants";

export function statusBadgeClass(s: LeadStatus | string): string {
  const map: Record<LeadStatus, string> = {
    novo: "bg-chart-2/15 text-chart-2 border-chart-2/30 hover:bg-chart-2/20",
    contatado: "bg-chart-3/15 text-chart-3 border-chart-3/30 hover:bg-chart-3/20",
    qualificado: "bg-warning/15 text-warning border-warning/30 hover:bg-warning/20",
    visita: "bg-gold/15 text-gold border-gold/30 hover:bg-gold/20",
    proposta: "bg-navy/10 text-navy border-navy/30 hover:bg-navy/20",
    ganho: "bg-success/15 text-success border-success/30 hover:bg-success/20",
    perdido: "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20",
  };
  return "border " + (map[s as LeadStatus] ?? "");
}

export function scoreColor(score: number): string {
  if (score >= 70) return "bg-success/15 text-success border-success/30";
  if (score >= 40) return "bg-warning/15 text-warning border-warning/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
}
