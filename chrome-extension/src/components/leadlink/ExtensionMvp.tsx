import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bed,
  Building2,
  CalendarClock,
  Car,
  CheckCircle2,
  Copy as CopyIcon,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Ruler,
  Search,
  Send,
  Settings,
  Sparkles,
  UserCircle2,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  ApiError,
  analyzeConversation,
  createAppointment,
  type ConversationAnalysis,
  type ConversationMessage,
  getAppointments,
  getLeadById,
  getLeadByPhone,
  getLeads,
  getProperties,
  login,
  me,
  recordLeadActivity,
  type Appointment,
  type AppointmentType,
  type Lead,
  type Property,
} from "@/lib/api";
import {
  buildLeadWhatsappUrl,
  buildPropertyMessage,
  buildPropertyPublicLink,
  defaultQuickReplies,
  formatDateTimeBR,
  formatCurrency,
  formatQuizAnswerValue,
  formatRelativeDateTime,
  friendlyQuizLabel,
  leadDisplayDate,
} from "@/lib/messages";
import {
  appointmentDateText,
  appointmentTypeLabel,
  buildAppointmentActivity,
  buildAppointmentPayload,
  buildScheduleDraft,
  type AppointmentDraft,
  validateAppointmentForm,
} from "@/lib/appointments";
import { compareFollowUpPriority, followUpForLead, type FollowUpCategory, type FollowUpItem } from "@/lib/followup";
import { formatPhone, possiblePhoneVariants } from "@/lib/phone";
import { clearAuth, getCurrentPhone, getQuickReplies, getToken, getUser, setCurrentPhone, setQuickReplies, type ExtensionUser } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { CopyButton, EmptyState, SectionLabel, SkeletonLine, StatusBadge, TempBadge } from "./primitives";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

type View = "lead" | "leads" | "imoveis" | "respostas" | "ia";
type CurrentLeadStatus = "idle" | "loading" | "found" | "not_found" | "error";
type Temp = "Quente" | "Morno" | "Frio";
type WhatsappTabState = "WHATSAPP_TAB" | "NOT_WHATSAPP_TAB";
type FollowUpFilter = "Todos" | FollowUpCategory;
type LeadActivityItem = NonNullable<Lead["activity"]>[number];

const navItems: { id: View; label: string; icon: typeof UserCircle2 }[] = [
  { id: "lead", label: "Lead", icon: UserCircle2 },
  { id: "leads", label: "Leads", icon: Users },
  { id: "imoveis", label: "Follow-up", icon: Sparkles },
  { id: "respostas", label: "Agenda", icon: CalendarClock },
  { id: "ia", label: "IA", icon: Zap },
];

const isDev = import.meta.env.DEV;

function hasChromeRuntime() {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.onMessage);
}

function appBaseUrl() {
  return (import.meta.env.VITE_APP_URL || import.meta.env.VITE_API_URL || "https://www.leadlink.app.br").replace(/\/$/, "");
}

function readWhatsappMessages(): Promise<ConversationMessage[]> {
  if (!hasChromeRuntime()) return Promise.resolve([]);

  return new Promise((resolve) => {
    // Timeout de segurança: se o service worker não responder em 5s (ex.: SW
    // inativo, tab do WhatsApp sem content script), resolve com array vazio
    // em vez de travar a UI indefinidamente.
    const timeout = window.setTimeout(() => resolve([]), 5000);

    chrome.runtime.sendMessage(
      { type: "LEADLINK_READ_WHATSAPP_MESSAGES" },
      (response?: { type?: string; messages?: ConversationMessage[] }) => {
        window.clearTimeout(timeout);
        resolve(Array.isArray(response?.messages) ? response.messages : []);
      },
    );
  });
}

function statusLabel(status?: string | null) {
  const normalized = String(status || "Novo").toLowerCase();
  if (normalized.includes("contato")) return "Em contato";
  if (normalized.includes("sem")) return "Sem resposta";
  if (normalized.includes("fechado")) return "Fechado";
  if (normalized.includes("interess")) return "Interessado";
  return "Novo";
}

function tempFromLead(lead: Lead): Temp {
  const classification = String(lead.classification || "").toLowerCase();
  if (classification.includes("quente")) return "Quente";
  if (classification.includes("morno")) return "Morno";
  if (classification.includes("frio")) return "Frio";
  const score = Number(lead.score || 0);
  if (score >= 70) return "Quente";
  if (score >= 40) return "Morno";
  return "Frio";
}

function initialsFor(user: ExtensionUser) {
  return (
    user.initials ||
    user.name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  );
}

function leadSummary(lead: Lead) {
  return (
    lead.profileSummary ||
    lead.notes ||
    [
      lead.interest ? `Interesse: ${lead.interest}` : "",
      lead.region ? `Regiao: ${lead.region}` : "",
      lead.timeline ? `Prazo: ${lead.timeline}` : "",
    ]
      .filter(Boolean)
      .join(" · ") ||
    "Lead encontrado no LeadLink."
  );
}

function formAnswers(lead: Lead) {
  if (!lead.quizAnswers || typeof lead.quizAnswers !== "object" || Array.isArray(lead.quizAnswers)) return [];
  return Object.entries(lead.quizAnswers)
    .map(([q, a]) => ({
      q,
      label: friendlyQuizLabel(q),
      a: formatQuizAnswerValue(a),
    }));
}

function useAuthSession(enabled: boolean) {
  const [user, setUser] = useState<ExtensionUser | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setUser(null);
      setLoading(false);
      return;
    }

    let active = true;
    async function load() {
      const token = await getToken();
      const storedUser = await getUser();
      if (!token) {
        if (active) setLoading(false);
        return;
      }
      if (storedUser && active) setUser(storedUser);
      try {
        const result = await me();
        if (active) setUser(result.user);
      } catch {
        await clearAuth();
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    const onExpired = () => {
      setUser(null);
      void clearAuth();
    };

    window.addEventListener("leadlink:session-expired", onExpired);
    void load();
    return () => {
      active = false;
      window.removeEventListener("leadlink:session-expired", onExpired);
    };
  }, [enabled]);

  return { user, setUser, loading };
}

function useWhatsappTabState() {
  const [tabState, setTabState] = useState<WhatsappTabState>("NOT_WHATSAPP_TAB");
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!hasChromeRuntime()) {
      setTabState("WHATSAPP_TAB");
      setResolved(true);
      return;
    }

    chrome.runtime.sendMessage({ type: "LEADLINK_GET_WHATSAPP_STATE" }, (response?: { tabState?: WhatsappTabState }) => {
      setTabState(response?.tabState || "NOT_WHATSAPP_TAB");
      setResolved(true);
    });

    function onMessage(message: { type?: string; tabState?: WhatsappTabState }) {
      if (message.type !== "LEADLINK_WHATSAPP_STATE_CHANGED") return;
      setTabState(message.tabState || "NOT_WHATSAPP_TAB");
      setResolved(true);
    }

    chrome.runtime.onMessage.addListener(onMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  return { tabState, resolved };
}

function useCurrentLead(isAuthed: boolean, tabState: WhatsappTabState) {
  const [phone, setPhone] = useState<string | null>(null);
  const [status, setStatus] = useState<CurrentLeadStatus>("idle");
  const [lead, setLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!isAuthed) return;

    async function syncPhone() {
      if (tabState !== "WHATSAPP_TAB") {
        setPhone(null);
        return;
      }
      if (hasChromeRuntime()) {
        chrome.runtime.sendMessage({ type: "LEADLINK_GET_CURRENT_PHONE" }, (response?: { phone?: string | null }) => {
          setPhone(response?.phone || null);
        });
        return;
      }
      const stored = await getCurrentPhone();
      setPhone(stored || null);
    }

    function onMessage(message: { type?: string; phone?: string | null; tabState?: WhatsappTabState }) {
      if (message.type === "LEADLINK_CURRENT_PHONE_CHANGED") {
        setPhone(message.phone || null);
      }
    }

    void syncPhone();
    if (hasChromeRuntime()) chrome.runtime.onMessage.addListener(onMessage);
    return () => {
      if (hasChromeRuntime()) chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, [isAuthed, tabState]);

  useEffect(() => {
    if (!isAuthed) return;
    const seq = ++requestSeq.current;
    setError(null);
    setLead(null);

    if (tabState !== "WHATSAPP_TAB") {
      setPhone(null);
      setStatus("idle");
      void setCurrentPhone(null);
      return;
    }

    if (!phone) {
      setStatus("idle");
      void setCurrentPhone(null);
      return;
    }

    void setCurrentPhone(phone);
    setStatus("loading");
    if (isDev) {
      console.log("[LeadLink][extension] detected phone", phone);
      console.log("[LeadLink][extension] detected variants", possiblePhoneVariants(phone));
    }
    getLeadByPhone(phone)
      .then((result) => {
        if (seq !== requestSeq.current) return;
        if (result.found) {
          if (isDev) {
            console.log("[LeadLink][extension] lead found", {
              leadId: result.lead.id,
              leadPhone: result.lead.phone,
              comparedVariants: possiblePhoneVariants(result.lead.phone),
            });
          }
          setLead(result.lead);
          setStatus("found");
        } else {
          if (isDev) console.log("[LeadLink][extension] lead not found");
          setStatus("not_found");
        }
      })
      .catch((err) => {
        if (seq !== requestSeq.current) return;
        setError(err instanceof Error ? err.message : "Erro ao buscar lead.");
        setStatus("error");
      });
  }, [phone, isAuthed, tabState]);

  return { phone, status, lead, error, tabState };
}

function currentLeadStatusForSelection(lead: Lead | null): CurrentLeadStatus {
  return lead ? "found" : "idle";
}

function leadDateMeta(lead: Pick<Lead, "createdAt" | "lastContact">) {
  return leadDisplayDate(lead);
}

function useLeadsList(enabled: boolean) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    setError(null);
    getLeads()
      .then((result) => {
        if (active) setLeads(result);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar leads.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { leads, loading, error };
}

const activityCooldowns = new Map<string, number>();

function fireAndForgetLeadActivity(leadId: string | null | undefined, type: string, text: string) {
  if (!leadId) return;
  const key = `${leadId}:${type}:${text}`;
  const now = Date.now();
  const lastRun = activityCooldowns.get(key) || 0;
  if (now - lastRun < 1200) return;
  activityCooldowns.set(key, now);
  void recordLeadActivity(leadId, type, text);
}

function activityAccent(type: string) {
  if (type.includes("open_whatsapp")) return { icon: ExternalLink, color: "#00C896" };
  if (type.includes("copied")) return { icon: CopyIcon, color: "#6C5CE7" };
  return { icon: MessageCircle, color: "#60A5FA" };
}

function prependLeadActivity(lead: Lead, activity: LeadActivityItem): Lead {
  const nextActivity = [activity, ...(lead.activity || [])]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 10);
  return { ...lead, activity: nextActivity };
}

function useQuickRepliesState() {
  const [replies, setReplies] = useState<string[]>(defaultQuickReplies);

  useEffect(() => {
    let active = true;
    getQuickReplies()
      .then((stored) => {
        if (!active) return;
        if (stored?.length) setReplies(stored);
        else setReplies(defaultQuickReplies);
      })
      .catch(() => {
        if (active) setReplies(defaultQuickReplies);
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = async (next: string[]) => {
    setReplies(next);
    if (next.length === defaultQuickReplies.length && next.every((item, index) => item === defaultQuickReplies[index])) {
      await setQuickReplies(null);
      return;
    }
    await setQuickReplies(next);
  };

  return { replies, persist };
}

function useAppointments(enabled: boolean) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setAppointments(await getAppointments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [enabled]);

  return { appointments, setAppointments, loading, error, refresh };
}

function usePropertiesCatalog(enabled: boolean) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    setError(null);
    getProperties()
      .then((items) => {
        if (active) setProperties(items);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar imoveis.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return { properties, loading, error };
}

function LoginView({ onLogin }: { onLogin: (user: ExtensionUser) => void }) {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      onLogin(result.user);
    } catch (err) {
      if (err instanceof ApiError && err.code === "plan_no_extension") {
        setError("Seu plano atual nao inclui acesso a extensao.");
      } else if (err instanceof ApiError && err.status === 401) {
        setError("E-mail ou senha invalidos.");
      } else {
        setError("Nao foi possivel conectar ao LeadLink.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col px-6 pt-14 pb-8 ll-fade-in">
      <div className="flex flex-col items-center mb-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[#4b3dd1] flex items-center justify-center mb-3 ll-glow">
          <Zap className="h-6 w-6 text-white" fill="currentColor" />
        </div>
        <div className="text-[18px] font-semibold tracking-tight">LeadLink</div>
        <div className="text-[11px] text-text-tertiary mt-0.5">Extension · v0.1</div>
      </div>

      <div className="text-center mb-7">
        <h1 className="text-[17px] font-semibold text-white">Acesse sua conta</h1>
        <p className="text-[12.5px] text-text-secondary mt-1.5">
          Entre com sua conta LeadLink para continuar
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            autoComplete="email"
            className="ll-input w-full pl-10 pr-3 py-2.5 text-[13px]"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            autoComplete="current-password"
            className="ll-input w-full pl-10 pr-10 py-2.5 text-[13px]"
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12px] text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="mt-2 w-full bg-primary hover:bg-primary-hover transition-colors text-white text-[13px] font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </button>
      </form>

      <div className="mt-auto text-center text-[10.5px] text-text-tertiary">
        Conectado ao WhatsApp Web · Seguro
      </div>
    </div>
  );
}

function Header({ hasLead, user, onLogout }: { hasLead: boolean; user: ExtensionUser; onLogout: () => void }) {
  const plan = user.planSlug === "comercial_ia" ? "Comercial IA" : user.planSlug || "Pro";

  return (
    <div className="h-[52px] flex items-center justify-between px-3.5 border-b border-border bg-background/90 backdrop-blur relative z-10">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-[#4b3dd1] flex items-center justify-center text-[10.5px] font-semibold">
            {initialsFor(user)}
          </div>
          {hasLead && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-background" />
          )}
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[13px] font-medium truncate">{user.name.split(" ")[0]}</span>
          <span className="text-[9.5px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
            {plan}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <button className="w-8 h-8 flex items-center justify-center rounded-md text-text-secondary hover:text-white hover:bg-surface-hover transition-colors">
          <Search className="h-4 w-4" />
        </button>
        <button
          onClick={onLogout}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-secondary hover:text-white hover:bg-surface-hover transition-colors"
          title="Sair"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function BottomNav({ active, onChange, hasLead }: { active: View; onChange: (v: View) => void; hasLead: boolean }) {
  return (
    <div className="h-[56px] border-t border-border bg-background/95 backdrop-blur flex items-stretch px-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        const dot = item.id === "lead" && hasLead;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors relative",
              isActive ? "text-primary" : "text-text-tertiary hover:text-text-secondary",
            )}
          >
            <div className="relative">
              <Icon
                className={cn(
                  "h-[18px] w-[18px] transition-all",
                  isActive && "drop-shadow-[0_0_8px_rgba(108,92,231,0.55)]",
                )}
              />
              {dot && !isActive && (
                <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-success ll-pulse" />
              )}
            </div>
            <span className="text-[9.5px] font-medium tracking-wide">{item.label}</span>
            {isActive && (
              <span className="absolute top-1.5 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(108,92,231,0.8)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function LeadView({
  status,
  lead,
  phone,
  error,
  quickReplies,
  onGoTo,
  onActivity,
  onSchedule,
  onOpenAi,
}: {
  status: CurrentLeadStatus;
  lead: Lead | null;
  phone: string | null;
  error?: string | null;
  quickReplies: string[];
  onGoTo: (view: View) => void;
  onActivity: (leadId: string | null | undefined, type: string, text: string) => void;
  onSchedule: (type: AppointmentType, lead: Lead) => void;
  onOpenAi: () => void;
}) {
  if (status === "idle") {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 ll-fade-in">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl ll-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
            <MessageCircle className="h-7 w-7 text-text-tertiary" />
          </div>
        </div>
        <h3 className="mt-5 text-[15px] font-semibold">Nenhuma conversa ativa</h3>
        <p className="mt-1.5 text-[12.5px] text-text-secondary text-center max-w-[260px] leading-relaxed">
          Abra uma conversa no WhatsApp Web para ver os dados do lead.
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="px-3.5 pt-4 space-y-3 ll-fade-in">
        <SkeletonLine className="w-2/5" />
        <div className="ll-card p-3.5 space-y-2">
          <SkeletonLine className="w-3/4" />
          <SkeletonLine className="w-1/2 h-2" />
          <SkeletonLine className="w-full h-2" />
          <SkeletonLine className="w-10/12 h-2" />
        </div>
        <div className="text-center text-[11.5px] text-primary ll-pulse">Buscando lead...</div>
      </div>
    );
  }

  if (status === "not_found") {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 ll-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4">
          <HelpCircle className="h-6 w-6 text-text-secondary" />
        </div>
        <h3 className="text-[15px] font-semibold">Contato nao identificado</h3>
        <p className="mt-1.5 text-[12.5px] text-text-secondary text-center max-w-[260px]">
          Este numero ainda nao existe no LeadLink.
        </p>
        <div className="mt-4 px-3 py-2 rounded-lg bg-surface border border-border text-[13px] font-mono tracking-wide">
          {formatPhone(phone)}
        </div>
        <button
          onClick={() => onGoTo("leads")}
          className="mt-5 w-full bg-primary hover:bg-primary-hover text-white text-[13px] font-medium py-2.5 rounded-lg inline-flex items-center justify-center gap-2"
        >
          <Users className="h-4 w-4" /> Ver leads
        </button>
        <button
          disabled
          title="Em breve"
          className="mt-2 w-full bg-surface border border-border text-text-tertiary text-[13px] font-medium py-2.5 rounded-lg inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <UserCircle2 className="h-4 w-4" /> Cadastrar lead
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 ll-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-danger" />
        </div>
        <h3 className="text-[15px] font-semibold">Erro ao buscar lead</h3>
        <p className="mt-1.5 text-[12.5px] text-text-secondary text-center max-w-[260px]">
          {error || "Tente novamente em instantes."}
        </p>
      </div>
    );
  }

  if (!lead) return null;
  const answers = formAnswers(lead);
  const history = lead.activity || [];
  const whatsappUrl = buildLeadWhatsappUrl(lead.phone);
  const dateMeta = leadDateMeta(lead);
  const handleOpenWhatsapp = () => {
    if (!whatsappUrl) return;
    onActivity(lead.id, "extension_open_whatsapp", "Conversa aberta pelo WhatsApp via extensao");
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="ll-fade-in pb-20">
      <div className="mx-3.5 mt-3.5 flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
        <span className="text-[11.5px] text-success font-medium">Lead identificado no LeadLink</span>
      </div>

      <div className="px-3.5 pt-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold tracking-tight leading-tight">{lead.name}</h2>
            <div className="text-[12px] text-text-secondary mt-0.5 flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> {formatPhone(lead.phone)}
            </div>
            {dateMeta.date && (
              <div className="text-[11px] text-text-tertiary mt-1">
                {dateMeta.label}: {dateMeta.date}
                {dateMeta.relative ? ` (${dateMeta.relative})` : ""}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Score</div>
            <div className="text-[16px] font-semibold text-primary">{lead.score ?? "-"}</div>
          </div>
        </div>
        <div className="mt-3">
          {whatsappUrl ? (
            <button
              type="button"
              onClick={handleOpenWhatsapp}
              className="inline-flex items-center gap-2 rounded-lg bg-surface-hover hover:bg-primary/15 border border-border hover:border-primary/30 px-3 py-2 text-[12px] font-medium transition-all"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir conversa
            </button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-2 text-[12px] font-medium text-text-tertiary opacity-70 cursor-not-allowed"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir conversa
                  </button>
                </TooltipTrigger>
                <TooltipContent>Telefone invalido</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => onSchedule("retorno", lead)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-hover hover:bg-primary/15 border border-border hover:border-primary/30 px-3 py-2 text-[12px] font-medium transition-all"
          >
            <CalendarClock className="h-3.5 w-3.5" /> Agendar retorno
          </button>
          <button
            type="button"
            onClick={() => onSchedule("visita", lead)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-hover hover:bg-primary/15 border border-border hover:border-primary/30 px-3 py-2 text-[12px] font-medium transition-all"
          >
            <Building2 className="h-3.5 w-3.5" /> Agendar visita
          </button>
        </div>
        <div className="mt-2">
          <button
            type="button"
            onClick={onOpenAi}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-hover hover:bg-primary/15 border border-border hover:border-primary/30 px-3 py-2 text-[12px] font-medium transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" /> Analisar conversa
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <StatusBadge status={statusLabel(lead.status)} />
          <TempBadge temp={tempFromLead(lead)} />
          {lead.source && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium text-text-secondary bg-surface-hover border border-border">
              {lead.source}
            </span>
          )}
        </div>
      </div>

      <div className="px-3.5 mt-5">
        <SectionLabel>Dados do lead</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {[
            { k: "Origem", v: lead.source },
            { k: "Interesse", v: lead.interest || lead.intentType },
            { k: "Orcamento", v: lead.budget || lead.budgetRange },
            { k: "Urgencia", v: lead.urgency },
          ].map((item) => (
            <div key={item.k} className="ll-card px-3 py-2.5">
              <div className="text-[10.5px] text-text-tertiary uppercase tracking-wider">{item.k}</div>
              <div className="text-[13px] font-semibold mt-0.5 truncate">{item.v || "-"}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3.5 mt-5">
        <div className="relative rounded-[12px] p-[1px] bg-gradient-to-br from-primary/60 via-primary/15 to-transparent">
          <div className="bg-surface rounded-[11px] p-3.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[12px] font-semibold">Resumo</span>
              <span className="ml-auto text-[9.5px] uppercase tracking-wider text-text-tertiary">LeadLink</span>
            </div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-text-secondary">{leadSummary(lead)}</p>
          </div>
        </div>
      </div>

      <div className="px-3.5 mt-4">
        <SectionLabel>Proximo passo</SectionLabel>
        <button className="w-full ll-card ll-card-hover px-3 py-3 text-left flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <ArrowRight className="h-4 w-4" />
          </div>
          <span className="text-[13px] leading-snug">{lead.nextStep || "Retomar contato pelo WhatsApp."}</span>
        </button>
      </div>

      <div className="px-3.5 mt-5">
        <SectionLabel>Respostas rapidas</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {quickReplies.slice(0, 6).map((reply) => (
            <QuickReplyChip key={reply} text={reply} leadId={lead.id} onActivity={onActivity} />
          ))}
        </div>
      </div>

      <div className="px-3.5 mt-5">
        <SectionLabel>Respostas do formulario</SectionLabel>
        <div className="ll-card divide-y divide-border overflow-hidden">
          {answers.length ? (
            answers.map((answer) => <FormAnswerRow key={answer.q} q={answer.label} a={answer.a} />)
          ) : (
            <div className="px-3 py-2.5 text-[12px] text-text-secondary">Sem respostas registradas.</div>
          )}
        </div>
      </div>

      <div className="px-3.5 mt-5">
        <SectionLabel>Historico recente</SectionLabel>
        <div className="ll-card p-3.5">
          <ol className="space-y-3">
            {history.map((item, index) => (
              <li key={item.id || index} className="flex items-start gap-3">
                <ActivityBullet type={item.type} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] text-text-secondary leading-snug">{item.text}</div>
                  <div className="mt-0.5 text-[10.5px] text-text-tertiary">
                    {formatRelativeDateTime(item.createdAt) || formatDateTimeBR(item.createdAt)}
                  </div>
                </div>
              </li>
            ))}
            {!history.length && (
              <li className="text-[12px] text-text-secondary">Sem atividades recentes ainda.</li>
            )}
          </ol>
        </div>
      </div>

      <div className="px-3.5 mt-3 flex gap-2 text-[10.5px] text-text-tertiary">
        <button onClick={() => onGoTo("imoveis")} className="hover:text-primary">
          Enviar imovel
        </button>
      </div>
    </div>
  );
}

function FormAnswerRow({ q, a }: { q: string; a: string }) {
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[12px] text-text-secondary shrink-0">{q}:</span>
        <span className="text-[13px] font-semibold text-white text-right break-words max-w-[190px]">{a || "Nao informado"}</span>
      </div>
    </div>
  );
}

function ActivityBullet({ type }: { type: string }) {
  const meta = activityAccent(type);
  const Icon = meta.icon;
  return (
    <div
      className="mt-0.5 h-6 w-6 rounded-full border border-border flex items-center justify-center shrink-0"
      style={{ color: meta.color, background: `${meta.color}1A` }}
    >
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}

function NotWhatsappView() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 ll-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
        <MessageCircle className="h-7 w-7 text-text-tertiary" />
      </div>
      <h3 className="mt-5 text-[15px] font-semibold">Abra o WhatsApp Web para usar a extensao</h3>
      <p className="mt-1.5 text-[12.5px] text-text-secondary text-center max-w-[260px] leading-relaxed">
        A sidepanel funciona somente em https://web.whatsapp.com.
      </p>
      <button
        type="button"
        onClick={() => window.open("https://web.whatsapp.com", "_blank", "noopener,noreferrer")}
        className="mt-5 w-full bg-primary hover:bg-primary-hover text-white text-[13px] font-medium py-2.5 rounded-lg inline-flex items-center justify-center gap-2"
      >
        <ExternalLink className="h-4 w-4" /> Abrir WhatsApp Web
      </button>
    </div>
  );
}

function QuickReplyChip({
  text,
  leadId,
  onActivity,
}: {
  text: string;
  leadId?: string | null;
  onActivity: (leadId: string, type: string, text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    if (copied) return;
    navigator.clipboard?.writeText(text).catch(() => {});
    if (leadId) onActivity(leadId, "extension_quick_reply_copied", "Resposta rapida copiada");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-[11.5px] px-2.5 py-1.5 rounded-full border transition-all",
        copied
          ? "bg-success/15 border-success/30 text-success"
          : "bg-surface-hover border-border text-text-secondary hover:border-primary/40 hover:text-white",
      )}
    >
      {copied ? "Copiado" : text}
    </button>
  );
}

function LeadsView({
  onSelectLead,
  initialLeads,
  loading: initialLoading,
  error: initialError,
}: {
  onSelectLead: (lead: Lead) => void;
  initialLeads?: Lead[];
  loading?: boolean;
  error?: string | null;
}) {
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [dateFilter, setDateFilter] = useState("Todos");
  const [query, setQuery] = useState("");
  const filters = ["Todos", "Quentes", "Novos", "Em contato", "Sem resposta"];
  const dateFilters = ["Todos", "Hoje", "Ultimos 7 dias", "Ultimos 30 dias", "Sem contato"];
  const leads = initialLeads ?? [];
  const loading = initialLoading ?? false;
  const error = initialError ?? null;

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const referenceDate = lead.lastContact || lead.createdAt || null;
      const parsedTime = referenceDate ? new Date(referenceDate).getTime() : NaN;
      const ageDays = Number.isFinite(parsedTime) ? Math.max(0, Math.floor((Date.now() - parsedTime) / 86_400_000)) : null;

      if (
        normalizedQuery &&
        !lead.name.toLowerCase().includes(normalizedQuery) &&
        !formatPhone(lead.phone).includes(normalizedQuery) &&
        !lead.phone.includes(normalizedQuery)
      ) {
        return false;
      }
      if (statusFilter === "Quentes" && tempFromLead(lead) !== "Quente") return false;
      if (statusFilter === "Novos" && statusLabel(lead.status) !== "Novo") return false;
      if (statusFilter === "Em contato" && statusLabel(lead.status) !== "Em contato") return false;
      if (statusFilter === "Sem resposta" && statusLabel(lead.status) !== "Sem resposta") return false;

      if (dateFilter === "Hoje" && ageDays !== 0) return false;
      if (dateFilter === "Ultimos 7 dias" && (ageDays === null || ageDays > 7)) return false;
      if (dateFilter === "Ultimos 30 dias" && (ageDays === null || ageDays > 30)) return false;
      if (dateFilter === "Sem contato" && lead.lastContact) return false;
      return true;
    });
  }, [dateFilter, leads, query, statusFilter]);

  return (
    <div className="ll-fade-in pb-4">
      <div className="px-3.5 pt-3.5">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel className="mb-0">Meus leads</SectionLabel>
          <span className="text-[10.5px] text-text-tertiary">{leads.length} contatos</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou telefone"
            className="ll-input w-full pl-9 pr-3 py-2 text-[12.5px]"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-1.5 px-3.5 overflow-x-auto no-scrollbar">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setStatusFilter(item)}
            className={cn(
              "text-[11.5px] px-2.5 py-1.5 rounded-full border whitespace-nowrap transition-colors",
              statusFilter === item
                ? "bg-primary/15 border-primary/30 text-primary"
                : "bg-surface border-border text-text-secondary hover:text-white",
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 px-3.5 overflow-x-auto no-scrollbar">
        {dateFilters.map((item) => (
          <button
            key={item}
            onClick={() => setDateFilter(item)}
            className={cn(
              "text-[11.5px] px-2.5 py-1.5 rounded-full border whitespace-nowrap transition-colors",
              dateFilter === item
                ? "bg-primary/15 border-primary/30 text-primary"
                : "bg-surface border-border text-text-secondary hover:text-white",
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="px-3.5 mt-3 flex flex-col gap-1.5">
        {loading && <SkeletonLine className="w-full h-12" />}
        {error && <EmptyState icon={<AlertCircle className="h-5 w-5" />} title="Erro ao carregar leads" subtitle={error} />}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="Nenhum lead encontrado"
            subtitle="Ajuste a busca ou os filtros locais."
          />
        )}
        {!loading && !error && filtered.map((lead) => <LeadCard key={lead.id} lead={lead} onClick={() => onSelectLead(lead)} />)}
      </div>
    </div>
  );
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const dateMeta = leadDateMeta(lead);
  return (
    <button onClick={onClick} className="ll-card ll-card-hover text-left p-3 group">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13.5px] font-semibold truncate">{lead.name}</span>
        <TempBadge temp={tempFromLead(lead)} />
      </div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className="text-[11.5px] text-text-secondary">{formatPhone(lead.phone)}</span>
        <StatusBadge status={statusLabel(lead.status)} />
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[10.5px] text-text-tertiary">
        <span>{lead.source || "LeadLink"}</span>
        <span>{dateMeta.relative || "sem data"}</span>
      </div>
      {dateMeta.date && (
        <div className="mt-1 text-[10.5px] text-text-tertiary">
          {dateMeta.label}: {dateMeta.date}
          {dateMeta.relative ? ` (${dateMeta.relative})` : ""}
        </div>
      )}
    </button>
  );
}

function PropertiesView({ currentLead, user }: { currentLead: Lead | null; user: ExtensionUser }) {
  const [filter, setFilter] = useState("Todos");
  const [query, setQuery] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [sheet, setSheet] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filters = ["Todos", "Disponiveis", "Apartamento", "Casa"];

  useEffect(() => {
    let active = true;
    getProperties()
      .then((result) => {
        if (active) setProperties(result);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar imoveis.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return properties.filter((property) => {
      if (q && ![property.title, property.neighborhood, property.city].some((v) => String(v || "").toLowerCase().includes(q))) {
        return false;
      }
      if (filter === "Disponiveis") return String(property.status || "").toLowerCase().includes("dispon");
      if (filter !== "Todos") return String(property.type || "").toLowerCase().includes(filter.toLowerCase());
      return true;
    });
  }, [filter, properties, query]);

  return (
    <div className="ll-fade-in pb-4 relative">
      <div className="px-3.5 pt-3.5">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel className="mb-0">Imoveis</SectionLabel>
          <span className="text-[10.5px] text-text-tertiary">{properties.length} cadastrados</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar imovel, bairro..."
            className="ll-input w-full pl-9 pr-3 py-2 text-[12.5px]"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-1.5 px-3.5 overflow-x-auto no-scrollbar">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={cn(
              "text-[11.5px] px-2.5 py-1.5 rounded-full border whitespace-nowrap transition-colors",
              filter === item
                ? "bg-primary/15 border-primary/30 text-primary"
                : "bg-surface border-border text-text-secondary hover:text-white",
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="px-3.5 mt-3 flex flex-col gap-2.5">
        {loading && <SkeletonLine className="w-full h-24" />}
        {error && <EmptyState icon={<AlertCircle className="h-5 w-5" />} title="Erro ao carregar imoveis" subtitle={error} />}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState icon={<Building2 className="h-5 w-5" />} title="Nenhum imovel encontrado" />
        )}
        {!loading && !error && filtered.map((property) => (
          <PropertyCard key={property.id} property={property} onSend={() => setSheet(property)} />
        ))}
      </div>
      {sheet && (
        <SendPropertySheet
          property={sheet}
          lead={currentLead}
          userSlug={user.slug}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

function PropertyCard({ property, onSend }: { property: Property; onSend: () => void }) {
  const image = property.image || property.images?.[0];
  return (
    <div className="ll-card ll-card-hover overflow-hidden">
      <div className="relative h-[110px] bg-surface-hover">
        {image ? (
          <img src={image} alt={property.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-tertiary">
            <Building2 className="h-8 w-8" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <StatusBadge status={property.status || "Disponivel"} />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-[13.5px] font-semibold truncate">{property.title}</h4>
            <div className="text-[11.5px] text-text-secondary mt-0.5">
              {[property.neighborhood, property.city].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div className="text-[13px] font-semibold text-success whitespace-nowrap">
            {formatCurrency(property.price)}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-text-tertiary">
          <span className="inline-flex items-center gap-1">
            <Bed className="h-3 w-3" /> {property.bedrooms || 0} q
          </span>
          <span className="inline-flex items-center gap-1">
            <Ruler className="h-3 w-3" /> {property.area || 0} m2
          </span>
          <span className="inline-flex items-center gap-1">
            <Car className="h-3 w-3" /> {property.parking || 0}
          </span>
        </div>
        <button
          onClick={onSend}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-medium py-2 rounded-lg bg-surface-hover hover:bg-primary/15 hover:text-primary border border-border hover:border-primary/30 transition-all"
        >
          <Send className="h-3.5 w-3.5" /> Enviar para lead
        </button>
      </div>
    </div>
  );
}

function SendPropertySheet({
  property,
  lead,
  userSlug,
  onClose,
}: {
  property: Property;
  lead: Lead | null;
  userSlug?: string | null;
  onClose: () => void;
}) {
  const link = buildPropertyPublicLink(property, userSlug);
  const [message, setMessage] = useState(() =>
    buildPropertyMessage({ property, leadName: lead?.name, userSlug }),
  );

  return (
    <div className="absolute inset-0 z-30 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full bg-surface border-t border-border rounded-t-2xl p-4 ll-slide-up"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10.5px] text-text-tertiary uppercase tracking-wider">Enviar para</div>
            <div className="text-[13.5px] font-semibold">{lead?.name || "contato atual"}</div>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="text-[10.5px] text-text-tertiary uppercase tracking-wider mb-1.5">
          Preview da mensagem
        </div>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={7}
          className="ll-input w-full px-3 py-2.5 text-[12.5px] leading-relaxed resize-none"
        />
        <div className="flex gap-2 mt-3">
          <CopyButton
            text={link}
            label="Copiar link"
            onCopy={() =>
              fireAndForgetLeadActivity(
                lead?.id,
                "extension_property_link_copied",
                `Link do imóvel copiado: ${property.title}`,
              )
            }
          />
          <div className="ml-auto">
            <CopyButton
              text={message}
              label="Copiar mensagem"
              variant="solid"
              onCopy={() =>
                fireAndForgetLeadActivity(
                  lead?.id,
                  "extension_property_message_copied",
                  `Mensagem de imóvel copiada: ${property.title}`,
                )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function categoryLabel(category: FollowUpCategory) {
  return category === "Reativacao" ? "Reativação" : category;
}

function FollowUpView({
  leads,
  loading,
  error,
  onSelectLead,
}: {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  onSelectLead: (lead: Lead) => void;
}) {
  const [filter, setFilter] = useState<FollowUpFilter>("Todos");
  const filters: FollowUpFilter[] = ["Todos", "Urgente", "Sem resposta", "Oportunidade", "Reativacao"];

  const followUps = useMemo(
    () =>
      leads
        .map((lead) => followUpForLead(lead, tempFromLead(lead)))
        .filter((item): item is FollowUpItem => Boolean(item))
        .sort((a, b) => {
          const categoryDiff = compareFollowUpPriority(a, b);
          if (categoryDiff !== 0) return categoryDiff;
          const aTime = new Date(a.lead.lastContact || a.lead.createdAt || 0).getTime();
          const bTime = new Date(b.lead.lastContact || b.lead.createdAt || 0).getTime();
          return bTime - aTime;
        }),
    [leads],
  );

  const filtered = useMemo(
    () => (filter === "Todos" ? followUps : followUps.filter((item) => item.category === filter)),
    [filter, followUps],
  );

  return (
    <div className="ll-fade-in pb-4">
      <div className="px-3.5 pt-3.5">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel className="mb-0">Follow-up</SectionLabel>
          <span className="text-[10.5px] text-text-tertiary">{filtered.length} pendencias</span>
        </div>
        <p className="text-[12px] text-text-secondary leading-relaxed">
          Veja quem precisa de retorno agora e copie uma mensagem pronta.
        </p>
      </div>

      <div className="mt-3 flex gap-1.5 px-3.5 overflow-x-auto no-scrollbar">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={cn(
              "text-[11.5px] px-2.5 py-1.5 rounded-full border whitespace-nowrap transition-colors",
              filter === item
                ? "bg-primary/15 border-primary/30 text-primary"
                : "bg-surface border-border text-text-secondary hover:text-white",
            )}
          >
            {item === "Reativacao" ? "Reativação" : item}
          </button>
        ))}
      </div>

      <div className="px-3.5 mt-3 flex flex-col gap-2">
        {loading && (
          <>
            <SkeletonLine className="w-full h-24" />
            <SkeletonLine className="w-full h-24" />
          </>
        )}
        {error && <EmptyState icon={<AlertCircle className="h-5 w-5" />} title="Erro ao carregar follow-up" subtitle={error} />}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="Tudo em dia por aqui."
            subtitle="Seus leads nao tem pendencias de follow-up agora."
          />
        )}
        {!loading && !error && filtered.map((item) => (
          <FollowUpCard key={`${item.category}-${item.lead.id}`} item={item} onSelectLead={onSelectLead} />
        ))}
      </div>
    </div>
  );
}

function FollowUpCard({
  item,
  onSelectLead,
}: {
  item: FollowUpItem;
  onSelectLead: (lead: Lead) => void;
}) {
  const whatsappUrl = buildLeadWhatsappUrl(item.lead.phone);
  const categoryText = categoryLabel(item.category);
  const openLead = () => onSelectLead(item.lead);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openLead}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLead();
        }
      }}
      className="ll-card ll-card-hover text-left p-3 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold truncate">{item.lead.name}</div>
          <div className="text-[11.5px] text-text-secondary mt-0.5">{formatPhone(item.lead.phone)}</div>
        </div>
        <StatusBadge status={categoryLabel(item.category)} />
      </div>

      <div className="mt-2 text-[11.5px] text-text-secondary leading-relaxed">{item.reason}</div>
      <div className="mt-1 text-[10.5px] text-text-tertiary">
        {item.dateLabel}: {item.dateValue || "Sem data"}
      </div>

      <div className="mt-2.5 rounded-lg border border-border bg-surface-hover/70 px-3 py-2.5">
        <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary mb-1">Sugestao de mensagem</div>
        <p className="text-[12px] text-text-secondary leading-relaxed">{item.message}</p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <CopyButton
          text={item.message}
          label="Copiar mensagem"
          variant="solid"
          onCopy={() =>
            fireAndForgetLeadActivity(
              item.lead.id,
              "extension_followup_message_copied",
              `Mensagem de follow-up copiada: ${categoryText}`,
            )
          }
        />
        {whatsappUrl ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              fireAndForgetLeadActivity(
                item.lead.id,
                "extension_followup_open_whatsapp",
                `Conversa de follow-up aberta pelo WhatsApp: ${categoryText}`,
              );
              window.open(whatsappUrl, "_blank", "noopener,noreferrer");
            }}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-md text-text-secondary hover:text-white hover:bg-surface-hover"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Abrir conversa</span>
          </button>
        ) : (
          <span className="text-[11px] text-text-tertiary">Telefone invalido</span>
        )}
      </div>
    </div>
  );
}

export function AiView({
  currentLead,
  hasConversation,
  planSlug,
  onAnalyze,
  loading,
  error,
  analysis,
  onActivity,
}: {
  currentLead: Lead | null;
  hasConversation: boolean;
  planSlug: string;
  onAnalyze: () => Promise<void>;
  loading: boolean;
  error: string | null;
  analysis: ConversationAnalysis | null;
  onActivity: (leadId: string | null | undefined, type: string, text: string) => void;
}) {
  const canUseAi = planSlug === "comercial_ia";

  if (!hasConversation) {
    return (
      <div className="ll-fade-in pb-4">
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="Nenhuma conversa ativa"
          subtitle="Abra uma conversa no WhatsApp Web para analisar as mensagens visiveis."
        />
      </div>
    );
  }

  if (!canUseAi) {
    return (
      <div className="ll-fade-in pb-4">
        <div className="px-3.5 pt-3.5">
          <SectionLabel>IA</SectionLabel>
        </div>
        <EmptyState
          icon={<Lock className="h-5 w-5" />}
          title="IA disponivel no plano Comercial IA"
          subtitle="Faca upgrade para liberar a analise assistida da conversa."
          action={(
            <button
              type="button"
              onClick={() => window.open(`${appBaseUrl()}/planos`, "_blank", "noopener,noreferrer")}
              className="bg-primary hover:bg-primary-hover text-white text-[13px] font-medium py-2.5 px-4 rounded-lg inline-flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" /> Fazer upgrade
            </button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="ll-fade-in pb-4">
      <div className="px-3.5 pt-3.5">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel className="mb-0">IA</SectionLabel>
          <span className="text-[10.5px] text-text-tertiary">Copiloto controlado</span>
        </div>
        <p className="text-[12px] text-text-secondary leading-relaxed">
          Analise somente as ultimas mensagens visiveis da conversa quando voce pedir.
        </p>
      </div>

      <div className="px-3.5 mt-3">
        <button
          type="button"
          onClick={() => void onAnalyze()}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-hover text-white text-[13px] font-medium py-2.5 rounded-lg inline-flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Analisando conversa..." : "Analisar conversa"}
        </button>
      </div>

      {error && (
        <div className="px-3.5 mt-3">
          <div className="ll-card border border-danger/30 bg-danger/10 p-3 text-[12px] text-danger">{error}</div>
        </div>
      )}

      {!analysis && !loading && !error && (
        <EmptyState
          icon={<MessageCircle className="h-5 w-5" />}
          title="Pronto para analisar"
          subtitle="Clique em Analisar conversa para ler apenas as ultimas mensagens visiveis e gerar sugestoes."
        />
      )}

      {analysis && (
        <div className="px-3.5 mt-3 flex flex-col gap-3">
          <div className="ll-card p-3">
            <SectionLabel>Resumo</SectionLabel>
            <p className="text-[12.5px] text-text-secondary leading-relaxed">{analysis.summary}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="ll-card p-3">
              <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary">Intencao</div>
              <div className="mt-1 text-[12.5px] text-text-secondary leading-relaxed">{analysis.intent}</div>
            </div>
            <div className="ll-card p-3">
              <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary">Temperatura</div>
              <div className="mt-1">
                <StatusBadge status={analysis.temperature === "quente" ? "Quente" : analysis.temperature === "morno" ? "Morno" : "Frio"} />
              </div>
            </div>
          </div>

          <div className="ll-card p-3">
            <SectionLabel>Objecoes</SectionLabel>
            <ul className="space-y-2">
              {analysis.objections.map((objection) => (
                <li key={objection} className="text-[12.5px] text-text-secondary leading-relaxed flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{objection}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="ll-card p-3">
            <SectionLabel>Proximo passo</SectionLabel>
            <p className="text-[12.5px] text-text-secondary leading-relaxed">{analysis.nextStep}</p>
          </div>

          <div className="space-y-2">
            <SectionLabel>Respostas sugeridas</SectionLabel>
            {analysis.suggestedReplies.map((reply, index) => (
              <div key={`${index}-${reply}`} className="ll-card p-3 flex items-start gap-3">
                <p className="text-[12.5px] text-text-secondary leading-relaxed flex-1">{reply}</p>
                <CopyButton
                  text={reply}
                  label="Copiar"
                  onCopy={() => onActivity(currentLead?.id, "extension_ai_reply_copied", "Resposta sugerida por IA copiada")}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgendaView({
  currentLead,
  appointments,
  properties,
  propertiesLoading,
  loading,
  error,
  onRefresh,
  onCreated,
  draft,
  clearDraft,
}: {
  currentLead: Lead | null;
  appointments: Appointment[];
  properties: Property[];
  propertiesLoading: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onCreated: (appointment: Appointment) => void;
  draft: AppointmentDraft | null;
  clearDraft: () => void;
}) {
  const [type, setType] = useState<AppointmentType>("retorno");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [propertyQuery, setPropertyQuery] = useState("");
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredProperties = useMemo(() => {
    const query = propertyQuery.trim().toLowerCase();
    const items = !query
      ? properties.slice(0, 8)
      : properties
          .filter((property) =>
            [property.title, property.neighborhood, property.city]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(query)),
          )
          .slice(0, 8);
    return items;
  }, [properties, propertyQuery]);

  useEffect(() => {
    if (!draft) return;
    setType(draft.type);
    setTitle(draft.title);
    clearDraft();
  }, [clearDraft, draft]);

  const submit = async () => {
    const validation = validateAppointmentForm({ title, date, time });
    if (!validation.ok && validation.error === "missing_title") {
      toast.error("Informe um titulo para o agendamento.");
      return;
    }
    if (!validation.ok && validation.error === "missing_datetime") {
      toast.error("Selecione data e horario.");
      return;
    }

    setSaving(true);
    try {
      const appointment = await createAppointment(
        buildAppointmentPayload({
          title,
          type,
          date,
          time,
          notes,
          propertyId: selectedProperty?.id,
          propertyTitle: selectedProperty?.title,
          currentLead,
          draft,
        }),
      );

      onCreated(appointment);
      toast.success("Agendamento criado");
      setDate("");
      setTime("");
      setNotes("");
      setPropertyQuery("");
      setPropertyOpen(false);
      setSelectedProperty(null);
      void onRefresh().catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel criar o agendamento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ll-fade-in pb-4">
      <div className="px-3.5 pt-3.5">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel className="mb-0">Agenda</SectionLabel>
          <span className="text-[10.5px] text-text-tertiary">{appointments.length} proximos</span>
        </div>
        <p className="text-[12px] text-text-secondary leading-relaxed">
          Crie retornos, visitas e ligacoes vinculados ao lead atual.
        </p>
      </div>

      <div className="px-3.5 mt-3">
        <div className="ll-card p-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            {(["retorno", "visita", "ligacao", "reuniao", "proposta"] as AppointmentType[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-[12px] font-medium transition-colors",
                  type === item
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-surface border-border text-text-secondary hover:text-white",
                )}
              >
                {appointmentTypeLabel(item)}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Titulo"
            className="ll-input w-full px-3 py-2 text-[12.5px]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="ll-input w-full px-3 py-2 text-[12.5px]"
            />
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="ll-input w-full px-3 py-2 text-[12.5px]"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setPropertyOpen((value) => !value)}
              className="ll-input w-full px-3 py-2 text-[12.5px] text-left flex items-center justify-between"
            >
              <span className={selectedProperty ? "text-white truncate" : "text-text-tertiary truncate"}>
                {selectedProperty?.title || "Imovel relacionado (opcional)"}
              </span>
              <Search className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
            </button>
            {propertyOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-lg border border-border bg-surface shadow-xl overflow-hidden">
                <Command className="bg-transparent text-white">
                  <CommandInput
                    value={propertyQuery}
                    onValueChange={setPropertyQuery}
                    onFocus={() => setPropertyOpen(true)}
                    placeholder="Buscar imovel..."
                    className="text-[12.5px]"
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="px-3 py-3 text-[12px] text-text-secondary">
                        {propertiesLoading ? "Carregando imoveis..." : "Nenhum imovel encontrado."}
                      </div>
                    </CommandEmpty>
                    {selectedProperty && (
                      <CommandItem
                        value="limpar"
                        onSelect={() => {
                          setSelectedProperty(null);
                          setPropertyQuery("");
                          setPropertyOpen(false);
                        }}
                        className="text-[12.5px]"
                      >
                        Limpar selecao
                      </CommandItem>
                    )}
                    {filteredProperties.map((property) => (
                      <CommandItem
                        key={property.id}
                        value={`${property.title} ${property.neighborhood || ""} ${property.city || ""}`}
                        onSelect={() => {
                          setSelectedProperty(property);
                          setPropertyQuery(property.title);
                          setPropertyOpen(false);
                        }}
                        className="text-[12.5px] flex-col items-start gap-0.5"
                      >
                        <span className="font-medium">{property.title}</span>
                        <span className="text-[11px] text-text-secondary">
                          {[property.neighborhood, property.city].filter(Boolean).join(" · ") || "Sem localizacao"}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </div>
            )}
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value.slice(0, 500))}
            rows={3}
            placeholder="Observacao"
            className="ll-input w-full px-3 py-2.5 text-[12.5px] resize-none"
          />
          {currentLead && (
            <div className="text-[11px] text-text-tertiary">
              Lead associado: <span className="text-text-secondary">{currentLead.name}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="w-full bg-primary hover:bg-primary-hover text-white text-[13px] font-medium py-2.5 rounded-lg disabled:opacity-70"
          >
            {saving ? "Salvando..." : "Criar agendamento"}
          </button>
        </div>
      </div>

      <div className="px-3.5 mt-4 flex flex-col gap-2">
        <SectionLabel className="mb-0">Proximos compromissos</SectionLabel>
        {loading && (
          <>
            <SkeletonLine className="w-full h-16" />
            <SkeletonLine className="w-full h-16" />
          </>
        )}
        {error && <EmptyState icon={<AlertCircle className="h-5 w-5" />} title="Erro ao carregar agenda" subtitle={error} />}
        {!loading && !error && appointments.length === 0 && (
          <EmptyState
            icon={<CalendarClock className="h-5 w-5" />}
            title="Sem compromissos agendados."
          />
        )}
        {!loading && !error && appointments.map((appointment) => (
          <div key={appointment.id} className="ll-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold">{appointment.title}</div>
                <div className="text-[11.5px] text-text-secondary mt-0.5">
                  {appointmentTypeLabel(appointment.type)}
                  {appointment.leadName ? ` · ${appointment.leadName}` : ""}
                </div>
              </div>
              <StatusBadge status={appointmentTypeLabel(appointment.type)} />
            </div>
            <div className="mt-2 text-[11px] text-text-tertiary">
              {appointment.date ? appointmentDateText(appointment.date) : "Sem data"}
            </div>
            {appointment.propertyTitle && (
              <div className="mt-1 text-[11px] text-text-tertiary">Imovel: {appointment.propertyTitle}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickRepliesView({
  replies,
  selectedLeadId,
  onActivity,
  onAdd,
  onRemove,
  onRestore,
}: {
  replies: string[];
  selectedLeadId?: string | null;
  onActivity: (leadId: string | null | undefined, type: string, text: string) => void;
  onAdd: (value: string) => Promise<void>;
  onRemove: (value: string) => Promise<void>;
  onRestore: () => Promise<void>;
}) {
  const [newReply, setNewReply] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onAdd(newReply);
      setNewReply("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ll-fade-in pb-4">
      <div className="px-3.5 pt-4">
        <SectionLabel>Respostas rapidas</SectionLabel>
        <div className="ll-card p-3 mb-3 space-y-2">
          <textarea
            value={newReply}
            onChange={(event) => setNewReply(event.target.value.slice(0, 500))}
            rows={3}
            placeholder="Digite uma nova resposta rapida"
            className="ll-input w-full px-3 py-2.5 text-[12.5px] leading-relaxed resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10.5px] text-text-tertiary">{newReply.length}/500</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void onRestore()}
                className="text-[12px] font-medium px-2.5 py-1.5 rounded-md text-text-secondary hover:text-white hover:bg-surface-hover"
              >
                Restaurar padroes
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                className="bg-primary text-white hover:bg-primary-hover text-[12px] font-medium px-3 py-1.5 rounded-md disabled:opacity-70"
                disabled={saving}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {replies.map((reply) => (
            <div key={reply} className="ll-card ll-card-hover p-3 flex items-start gap-3">
              <p className="text-[12.5px] text-text-secondary leading-relaxed flex-1">{reply}</p>
              <div className="flex items-center gap-1 shrink-0">
                <CopyButton
                  text={reply}
                  label="Copiar"
                  onCopy={() => {
                    if (selectedLeadId) {
                      onActivity(selectedLeadId, "extension_quick_reply_copied", "Resposta rapida copiada");
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void onRemove(reply)}
                  className="text-[12px] font-medium px-2.5 py-1.5 rounded-md text-text-secondary hover:text-white hover:bg-surface-hover"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LeadLinkExtensionMvp() {
  const whatsappState = useWhatsappTabState();
  const isWhatsappTab = whatsappState.tabState === "WHATSAPP_TAB";
  const { user, setUser, loading } = useAuthSession(isWhatsappTab);
  const [view, setView] = useState<View>("lead");
  const [animKey, setAnimKey] = useState(0);
  const [appointmentDraft, setAppointmentDraft] = useState<AppointmentDraft | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<ConversationAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const current = useCurrentLead(Boolean(user) && isWhatsappTab, whatsappState.tabState);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { replies, persist } = useQuickRepliesState();
  const leadsState = useLeadsList(Boolean(user) && isWhatsappTab);
  const appointmentsState = useAppointments(Boolean(user) && isWhatsappTab);
  const propertiesState = usePropertiesCatalog(Boolean(user) && isWhatsappTab);
  const hasLead = isWhatsappTab && current.status === "found";

  useEffect(() => {
    if (current.lead) setSelectedLead(current.lead);
  }, [current.lead]);

  useEffect(() => {
    setAiAnalysis(null);
    setAiError(null);
    setAiLoading(false);
  }, [current.phone, selectedLead?.id]);

  useEffect(() => {
    if (!isWhatsappTab) {
      setSelectedLead(null);
      if (view === "lead") return;
      setView("lead");
      setAnimKey((key) => key + 1);
    }
  }, [isWhatsappTab, view]);

  useEffect(() => {
    if (!selectedLead?.id) return;
    if (!isWhatsappTab) return;
    let active = true;
    getLeadById(selectedLead.id)
      .then((lead) => {
        if (active) setSelectedLead(lead);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedLead?.id, isWhatsappTab]);

  const goTo = (next: View) => {
    setView(next);
    setAnimKey((key) => key + 1);
  };

  const activeLead = selectedLead ?? current.lead;
  const activeLeadStatus = selectedLead
    ? currentLeadStatusForSelection(selectedLead)
    : current.status;
  const activeLeadPhone = selectedLead?.phone ?? current.phone;

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    goTo("lead");
  };

  const handleActivity = (leadId: string | null | undefined, type: string, text: string) => {
    fireAndForgetLeadActivity(leadId, type, text);

    if (!leadId) return;

    const activity: LeadActivityItem = {
      id: `local-${Date.now()}`,
      type,
      text,
      createdAt: new Date().toISOString(),
    };

    if (selectedLead?.id === leadId) {
      setSelectedLead((currentLead) =>
        currentLead && currentLead.id === leadId ? prependLeadActivity(currentLead, activity) : currentLead,
      );
    }
  };

  const handleSchedule = (type: AppointmentType, lead: Lead) => {
    setAppointmentDraft(buildScheduleDraft(type, lead));
    goTo("respostas");
  };

  const handleOpenAi = () => {
    goTo("ia");
  };

  const handleAnalyzeConversation = async () => {
    if (!isWhatsappTab || !current.phone) {
      setAiError("Abra uma conversa ativa no WhatsApp Web para analisar.");
      return;
    }
    setAiLoading(true);
    setAiError(null);

    try {
      const messages = await readWhatsappMessages();
      if (!messages.length) {
        throw new Error("Nao foi possivel ler mensagens visiveis desta conversa.");
      }

      const analysis = await analyzeConversation({
        leadId: activeLead?.id,
        messages,
      });

      setAiAnalysis(analysis);
      handleActivity(activeLead?.id, "extension_ai_analysis_completed", "Analise de conversa por IA concluida");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setAiError(err.message || "IA disponivel no plano Comercial IA.");
      } else {
        setAiError(err instanceof Error ? err.message : "Nao foi possivel analisar a conversa.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleAppointmentCreated = (appointment: Appointment) => {
    appointmentsState.setAppointments((currentItems) =>
      [appointment, ...currentItems]
        .filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index)
        .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
        .slice(0, 10),
    );

    const activity = buildAppointmentActivity(appointment);
    if (activity) {
      handleActivity(activity.leadId, activity.type, activity.text);
    }
  };

  const logout = async () => {
    await clearAuth();
    setUser(null);
  };

  const addReply = async (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      toast.error("Resposta vazia nao pode ser adicionada.");
      return;
    }
    if (normalized.length > 500) {
      toast.error("A resposta deve ter no maximo 500 caracteres.");
      return;
    }
    if (replies.includes(normalized)) {
      toast.error("Essa resposta ja existe.");
      return;
    }
    await persist([...replies, normalized]);
    toast.success("Resposta adicionada");
  };

  const removeReply = async (value: string) => {
    await persist(replies.filter((item) => item !== value));
    toast.success("Resposta removida");
  };

  const restoreReplies = async () => {
    await persist(defaultQuickReplies);
    toast.success("Padroes restaurados");
  };

  return (
    <div className="w-[360px] h-screen max-h-screen bg-background text-white flex flex-col overflow-hidden border-x border-border relative">
      <Toaster richColors position="top-center" />
      {!whatsappState.resolved ? (
        <div className="h-full flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : !isWhatsappTab ? (
        <NotWhatsappView />
      ) : loading ? (
        <div className="h-full flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : !user ? (
        <LoginView onLogin={setUser} />
      ) : (
        <>
          <Header hasLead={hasLead} user={user} onLogout={logout} />
          <div key={animKey} className="flex-1 overflow-y-auto ll-scroll ll-fade-in">
            {view === "lead" ? (
              <LeadView
                status={activeLeadStatus}
                lead={activeLead}
                phone={activeLeadPhone}
                error={current.error}
                quickReplies={replies}
                onGoTo={goTo}
                onActivity={handleActivity}
                onSchedule={handleSchedule}
                onOpenAi={handleOpenAi}
              />
            ) : null}
            {isWhatsappTab && view === "leads" && (
              <LeadsView
                onSelectLead={handleSelectLead}
                initialLeads={leadsState.leads}
                loading={leadsState.loading}
                error={leadsState.error}
              />
            )}
            {isWhatsappTab && view === "imoveis" && (
              <FollowUpView
                leads={leadsState.leads}
                loading={leadsState.loading}
                error={leadsState.error}
                onSelectLead={handleSelectLead}
              />
            )}
            {isWhatsappTab && view === "respostas" && (
              <AgendaView
                currentLead={activeLead}
                appointments={appointmentsState.appointments}
                properties={propertiesState.properties}
                propertiesLoading={propertiesState.loading}
                loading={appointmentsState.loading}
                error={appointmentsState.error}
                onRefresh={appointmentsState.refresh}
                onCreated={handleAppointmentCreated}
                draft={appointmentDraft}
                clearDraft={() => setAppointmentDraft(null)}
              />
            )}
            {isWhatsappTab && view === "ia" && (
              <AiView
                currentLead={activeLead}
                hasConversation={Boolean(current.phone)}
                planSlug={user.planSlug || ""}
                onAnalyze={handleAnalyzeConversation}
                loading={aiLoading}
                error={aiError}
                analysis={aiAnalysis}
                onActivity={handleActivity}
              />
            )}
          </div>
          <BottomNav active={view} onChange={goTo} hasLead={hasLead} />
        </>
      )}
    </div>
  );
}
