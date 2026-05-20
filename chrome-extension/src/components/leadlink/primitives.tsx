import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  label = "Copiar",
  variant = "ghost",
  className,
  onCopy,
}: {
  text: string;
  label?: string;
  variant?: "ghost" | "solid";
  className?: string;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (copied) return;
    navigator.clipboard?.writeText(text).catch(() => {});
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-md transition-all duration-150",
        variant === "ghost"
          ? "text-text-secondary hover:text-white hover:bg-surface-hover"
          : "bg-primary text-white hover:bg-primary-hover",
        copied && "text-success hover:text-success",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? "Copiado" : label}</span>
    </button>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; b: string }> = {
    Interessado: { c: "#00C896", b: "rgba(0,200,150,0.12)" },
    "Em contato": { c: "#6C5CE7", b: "rgba(108,92,231,0.15)" },
    Novo: { c: "#60A5FA", b: "rgba(96,165,250,0.12)" },
    "Sem resposta": { c: "#FDBB2D", b: "rgba(253,187,45,0.12)" },
    Fechado: { c: "#94A3B8", b: "rgba(148,163,184,0.12)" },
    Disponível: { c: "#00C896", b: "rgba(0,200,150,0.12)" },
    Vendido: { c: "#FF6B6B", b: "rgba(255,107,107,0.12)" },
    Alugado: { c: "#94A3B8", b: "rgba(148,163,184,0.12)" },
    Confirmado: { c: "#00C896", b: "rgba(0,200,150,0.12)" },
    Agendado: { c: "#6C5CE7", b: "rgba(108,92,231,0.15)" },
    Urgente: { c: "#FF6B6B", b: "rgba(255,107,107,0.12)" },
    Oportunidade: { c: "#60A5FA", b: "rgba(96,165,250,0.12)" },
    "Reativação": { c: "#94A3B8", b: "rgba(148,163,184,0.12)" },
  };
  const m = map[status] ?? { c: "#94A3B8", b: "rgba(148,163,184,0.12)" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium tracking-wide"
      style={{ color: m.c, background: m.b }}
    >
      {status}
    </span>
  );
}

export function TempBadge({ temp }: { temp: "Quente" | "Morno" | "Frio" }) {
  const map = {
    Quente: { e: "🔥", c: "#FF6B6B", b: "rgba(255,107,107,0.1)" },
    Morno: { e: "🌡️", c: "#FDBB2D", b: "rgba(253,187,45,0.1)" },
    Frio: { e: "🧊", c: "#60A5FA", b: "rgba(96,165,250,0.1)" },
  } as const;
  const m = map[temp];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium"
      style={{ color: m.c, background: m.b }}
    >
      <span>{m.e}</span>
      {temp}
    </span>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("section-label mb-2.5", className)}>{children}</div>;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-10">
      <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-text-secondary mb-4">
        {icon}
      </div>
      <h3 className="text-[14px] font-semibold text-white">{title}</h3>
      {subtitle && (
        <p className="mt-1.5 text-[12.5px] text-text-secondary leading-relaxed max-w-[260px]">{subtitle}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-md h-3", className)} />;
}
