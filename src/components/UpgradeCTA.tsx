import { Lock, ArrowRight, Zap, Crown, Sparkles, TrendingUp, Users, BarChart3 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UPGRADE_MESSAGES, PLAN_LABELS, type PlanSlug } from "@/lib/plans";
import { cn } from "@/lib/utils";

const PLAN_ICON: Record<PlanSlug, React.ReactNode> = {
  free: <Zap className="h-3 w-3" />,
  pro: <Crown className="h-3 w-3" />,
  comercial: <Sparkles className="h-3 w-3" />,
  comercial_ia: <Sparkles className="h-3 w-3" />,
};

interface PlanBadgeProps {
  plan: PlanSlug;
  className?: string;
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const colors: Record<PlanSlug, string> = {
    free: "bg-secondary text-secondary-foreground",
    pro: "bg-navy text-navy-foreground",
    comercial: "bg-gold text-navy",
    comercial_ia: "bg-gold text-navy",
  };
  return (
    <Badge className={cn("gap-1 text-[10px] font-semibold shrink-0", colors[plan], className)}>
      {PLAN_ICON[plan]}
      {PLAN_LABELS[plan]}
    </Badge>
  );
}

const PLAN_BENEFITS: Record<PlanSlug, string[]> = {
  free: [],
  pro: [
    "Até 50 imóveis cadastrados",
    "CRM completo com status de lead",
    "Integração com WhatsApp",
    "Sem marca Leadlink",
  ],
  comercial: [
    "Até 15 usuários na equipe",
    "Dashboard avançado com relatórios",
    "Distribuição automática de leads",
    "Suporte prioritário",
  ],
  comercial_ia: [
    "Até 15 usuários na equipe",
    "Dashboard avançado com relatórios",
    "Distribuição automática de leads",
    "Suporte prioritário",
    "Assistente IA",
  ],
};

interface LockedFeatureProps {
  featureKey: string;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function LockedFeature({
  featureKey,
  children,
  className,
  compact = false,
}: LockedFeatureProps) {
  const navigate = useNavigate();
  const msg = UPGRADE_MESSAGES[featureKey] ?? {
    title: "Recurso bloqueado",
    description: "Faça upgrade do seu plano para desbloquear este recurso.",
    targetPlan: "pro" as PlanSlug,
  };

  if (compact) {
    return (
      <div className={cn("relative", className)}>
        <div className="pointer-events-none opacity-40 select-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() =>
              navigate({ to: "/planos", search: { success: undefined, canceled: undefined } })
            }
            className="flex items-center gap-1.5 bg-background/90 border border-border rounded-full px-3 py-1 text-xs font-medium shadow-sm hover:bg-secondary transition-colors"
          >
            <Lock className="h-3 w-3 shrink-0" />
            <PlanBadge plan={msg.targetPlan} />
          </button>
        </div>
      </div>
    );
  }

  const benefits = PLAN_BENEFITS[msg.targetPlan] ?? [];
  return (
    <div className={cn("relative rounded-lg overflow-hidden", className)}>
      <div className="pointer-events-none opacity-25 select-none blur-[1.5px]">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm p-5 text-center">
        <div className="h-11 w-11 rounded-full bg-secondary flex items-center justify-center">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1 max-w-xs">
          <PlanBadge plan={msg.targetPlan} className="mx-auto mb-1.5" />
          <p className="font-semibold text-sm">{msg.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{msg.description}</p>
        </div>
        {benefits.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-1.5 text-left">
                <span className="text-emerald">✓</span> {b}
              </li>
            ))}
          </ul>
        )}
        <Button
          size="sm"
          className={cn(
            "gap-1.5 mt-1",
            msg.targetPlan === "comercial" || msg.targetPlan === "comercial_ia"
              ? "bg-gold text-navy hover:bg-gold/90"
              : "bg-navy text-navy-foreground hover:bg-navy/90",
          )}
          onClick={() =>
            navigate({ to: "/planos", search: { success: undefined, canceled: undefined } })
          }
        >
          Fazer upgrade <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface UsageBannerProps {
  used: number;
  max: number;
  label: string;
  upgradeKey: string;
  className?: string;
}

export function UsageBanner({ used, max, label, upgradeKey, className }: UsageBannerProps) {
  const navigate = useNavigate();
  if (max <= 0) return null;
  const percent = Math.min(100, Math.round((used / max) * 100));
  const isAt = used >= max;
  const isNear = !isAt && percent >= 80;
  const msg = UPGRADE_MESSAGES[upgradeKey];
  if (!isNear && !isAt) return null;

  return (
    <Card
      className={cn(
        "p-3 sm:p-4 border",
        isAt ? "border-destructive/40 bg-destructive/5" : "border-amber-500/40 bg-amber-500/5",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
              isAt ? "bg-destructive/15" : "bg-amber-500/15",
            )}
          >
            <Lock className={cn("h-4 w-4", isAt ? "text-destructive" : "text-amber-600")} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug">
              {isAt
                ? `Limite atingido: ${label}`
                : `Usando ${used} de ${max} ${label.toLowerCase()}`}
            </p>
            {msg && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {msg.description}
              </p>
            )}
            <Progress
              value={percent}
              className={cn("mt-2 h-1.5", isAt ? "[&>div]:bg-destructive" : "[&>div]:bg-amber-500")}
            />
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-8 text-xs gap-1.5 self-end sm:self-auto"
          onClick={() =>
            navigate({ to: "/planos", search: { success: undefined, canceled: undefined } })
          }
        >
          Upgrade <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}

interface UpgradeCardProps {
  featureKey: string;
  className?: string;
}

export function UpgradeCard({ featureKey, className }: UpgradeCardProps) {
  const navigate = useNavigate();
  const msg = UPGRADE_MESSAGES[featureKey] ?? {
    title: "Recurso disponível em planos superiores",
    description: "Faça upgrade para desbloquear mais recursos.",
    targetPlan: "pro" as PlanSlug,
  };
  const benefits = PLAN_BENEFITS[msg.targetPlan] ?? [];
  const borderColors: Record<PlanSlug, string> = {
    free: "",
    pro: "border-navy/30 bg-gradient-to-b from-navy/5 to-transparent",
    comercial: "border-gold/30 bg-gradient-to-b from-gold/5 to-transparent",
    comercial_ia: "border-gold/30 bg-gradient-to-b from-gold/5 to-transparent",
  };
  const FeatureIcon =
    featureKey === "team_management"
      ? Users
      : featureKey === "advanced_dashboard"
        ? BarChart3
        : featureKey === "lead_distribution"
          ? TrendingUp
          : Lock;

  return (
    <Card
      className={cn(
        "p-6 flex flex-col items-center text-center gap-4 border",
        borderColors[msg.targetPlan],
        className,
      )}
    >
      <div
        className={cn(
          "h-13 w-13 rounded-xl flex items-center justify-center",
          msg.targetPlan === "comercial" || msg.targetPlan === "comercial_ia"
            ? "bg-gold/15"
            : msg.targetPlan === "pro"
              ? "bg-navy/10"
              : "bg-secondary",
        )}
      >
        <FeatureIcon
          className={cn(
            "h-6 w-6",
            msg.targetPlan === "comercial" || msg.targetPlan === "comercial_ia"
              ? "text-amber-600"
              : msg.targetPlan === "pro"
                ? "text-navy"
                : "text-muted-foreground",
          )}
        />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <PlanBadge plan={msg.targetPlan} className="mx-auto" />
        <p className="font-semibold text-base">{msg.title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{msg.description}</p>
      </div>
      {benefits.length > 0 && (
        <ul className="text-sm text-left space-y-1.5 self-stretch max-w-xs mx-auto">
          {benefits.map((b) => (
            <li key={b} className="flex items-center gap-2 text-muted-foreground">
              <span className="text-emerald font-bold shrink-0">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      <Button
        onClick={() =>
          navigate({ to: "/planos", search: { success: undefined, canceled: undefined } })
        }
        className={cn(
          "gap-2 w-full max-w-xs",
          msg.targetPlan === "comercial" || msg.targetPlan === "comercial_ia"
            ? "bg-gold text-navy hover:bg-gold/90 font-semibold"
            : "bg-navy text-navy-foreground hover:bg-navy/90",
        )}
      >
        Ver planos de upgrade <ArrowRight className="h-4 w-4" />
      </Button>
    </Card>
  );
}

interface PlanGateProps {
  allowed: boolean;
  featureKey: string;
  children: React.ReactNode;
  compact?: boolean;
  className?: string;
  card?: boolean;
}

export function PlanGate({
  allowed,
  featureKey,
  children,
  compact,
  className,
  card,
}: PlanGateProps) {
  if (allowed) return <>{children}</>;
  if (card) return <UpgradeCard featureKey={featureKey} className={className} />;
  return (
    <LockedFeature featureKey={featureKey} compact={compact} className={className}>
      {children}
    </LockedFeature>
  );
}

type UpgradeModalProps = {
  open: boolean;
  title: string;
  description: string;
  benefits: string[];
  primaryLabel: string;
  secondaryLabel: string;
  onOpenChange: (open: boolean) => void;
  onPrimary: () => void;
};

export function UpgradeModal({
  open,
  title,
  description,
  benefits,
  primaryLabel,
  secondaryLabel,
  onOpenChange,
  onPrimary,
}: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ul className="space-y-2 text-sm">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-muted-foreground">
                <span className="text-emerald font-bold">✓</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {secondaryLabel}
          </Button>
          <Button onClick={onPrimary}>{primaryLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
