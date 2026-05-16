export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled";

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  plan: "free" | "pro" | "comercial_ia";
  status: SubscriptionStatus;
  amount_cents: number;
  started_at: string;
  current_period_end: string | null;
  updated_at: string;
  profile?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
}

export interface AdminPlan {
  id: string;
  label: string;
  price: number;
  active: boolean;
  limits: { imoveis: number | null; agenda: number | null; automacoes: number | null; ia: boolean };
}

export interface AdminLogEntry {
  who: string;
  action: string;
  at: string;
}

export interface AdminSettingsState {
  branding: {
    platformName: string;
    logoUrl: string;
    primaryColor: string;
    accentColor: string;
  };
  domain: {
    defaultDomain: string;
    linkSubdomain: string;
    allowCustomDomain: boolean;
  };
  trial: {
    trialDays: number;
    freeProperties: number;
    freeAgenda: number;
    freeAutomations: number;
    warnBeforeEnd: boolean;
  };
  emails: {
    senderName: string;
    senderEmail: string;
    welcomeText: string;
  };
  integrations: {
    whatsappToken: string;
    googleMapsKey: string;
    monitoringWebhook: string;
  };
  notifications: {
    newSignup: boolean;
    newPaidSubscription: boolean;
    cancellation: boolean;
    overduePayment: boolean;
    dailyDigest: boolean;
  };
}

const SUBSCRIPTIONS_KEY = "leadlink:admin-subscriptions";
const PLANS_KEY = "leadlink:admin-plans";
const LOGS_KEY = "leadlink:admin-logs";
const SETTINGS_KEY = "leadlink:admin-settings";
const TEAM_KEY = "leadlink:admin-team";

const DEFAULT_PLAN_LIMITS = {
  imoveis: null,
  agenda: null,
  automacoes: null,
  ia: false,
};

export const DEFAULT_PLANS: AdminPlan[] = [
  { id: "free", label: "Gratuito", price: 0, active: true, limits: { imoveis: 3, agenda: 2, automacoes: 0, ia: false } },
  { id: "pro", label: "Pro", price: 97, active: true, limits: { ...DEFAULT_PLAN_LIMITS, ia: false } },
  { id: "comercial_ia", label: "Comercial IA", price: 497, active: true, limits: { ...DEFAULT_PLAN_LIMITS, ia: true } },
];

export const DEFAULT_SETTINGS: AdminSettingsState = {
  branding: {
    platformName: "Leadlink",
    logoUrl: "https://leadlink.com.br/logo.svg",
    primaryColor: "#0F1B3A",
    accentColor: "#D4AF37",
  },
  domain: {
    defaultDomain: "leadlink.com.br",
    linkSubdomain: "l.leadlink.com.br",
    allowCustomDomain: true,
  },
  trial: {
    trialDays: 30,
    freeProperties: 3,
    freeAgenda: 2,
    freeAutomations: 0,
    warnBeforeEnd: true,
  },
  emails: {
    senderName: "Leadlink",
    senderEmail: "contato@leadlink.com.br",
    welcomeText: "Olá! Seja bem-vindo ao Leadlink. Sua conta foi criada com sucesso.",
  },
  integrations: {
    whatsappToken: "",
    googleMapsKey: "",
    monitoringWebhook: "",
  },
  notifications: {
    newSignup: true,
    newPaidSubscription: true,
    cancellation: true,
    overduePayment: true,
    dailyDigest: false,
  },
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadAdminSubscriptions(): SubscriptionRecord[] {
  return read<SubscriptionRecord[]>(SUBSCRIPTIONS_KEY, []);
}

export function saveAdminSubscriptions(rows: SubscriptionRecord[]) {
  write(SUBSCRIPTIONS_KEY, rows);
}

export function upsertAdminSubscription(next: SubscriptionRecord) {
  const rows = loadAdminSubscriptions();
  const idx = rows.findIndex((row) => row.user_id === next.user_id);
  const updated = idx >= 0 ? rows.map((row) => (row.user_id === next.user_id ? next : row)) : [next, ...rows];
  saveAdminSubscriptions(updated);
  return updated;
}

export function loadAdminPlans(): AdminPlan[] {
  return read<AdminPlan[]>(PLANS_KEY, DEFAULT_PLANS);
}

export function saveAdminPlans(plans: AdminPlan[]) {
  write(PLANS_KEY, plans);
}

export function loadAdminLogs(): AdminLogEntry[] {
  return read<AdminLogEntry[]>(LOGS_KEY, []);
}

export function saveAdminLogs(logs: AdminLogEntry[]) {
  write(LOGS_KEY, logs);
}

export function pushAdminLog(entry: AdminLogEntry) {
  const logs = [entry, ...loadAdminLogs()].slice(0, 50);
  saveAdminLogs(logs);
  return logs;
}

export function loadAdminSettings(): AdminSettingsState {
  return read<AdminSettingsState>(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function saveAdminSettings(settings: AdminSettingsState) {
  write(SETTINGS_KEY, settings);
}

export function loadAdminTeam() {
  return read<{ user_id: string; role: string }[]>(TEAM_KEY, []);
}

export function saveAdminTeam(team: { user_id: string; role: string }[]) {
  write(TEAM_KEY, team);
}
