import { clearAuth, getToken, setToken, setUser, type ExtensionUser } from "@/lib/storage";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  source?: string | null;
  status?: string | null;
  score?: number | null;
  classification?: string | null;
  quizAnswers?: Record<string, unknown> | null;
  urgency?: string | null;
  budgetRange?: string | null;
  intentType?: string | null;
  interest?: string | null;
  budget?: string | null;
  region?: string | null;
  timeline?: string | null;
  nextStep?: string | null;
  profileSummary?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  lastContact?: string | null;
  activity?: Array<{ id: string; type: string; text: string; createdAt?: string | null }>;
};

export type LeadByPhoneResponse = { found: true; lead: Lead } | { found: false };

export type Property = {
  id: string;
  title: string;
  type?: string | null;
  businessType?: string | null;
  status?: string | null;
  price?: number | null;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: number | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  image?: string | null;
  images?: string[] | null;
};

export type AppointmentType = "retorno" | "visita" | "ligacao" | "reuniao" | "proposta";

export type Appointment = {
  id: string;
  title: string;
  type: AppointmentType;
  leadId?: string | null;
  leadName?: string | null;
  propertyId?: string | null;
  propertyTitle?: string | null;
  brokerId?: string | null;
  date?: string | null;
  duration?: number | null;
  location?: string | null;
  status?: string | null;
  createdAt?: string | null;
};

export type ConversationMessage = {
  from: "me" | "them";
  text: string;
  time?: string;
};

export type ConversationAnalysis = {
  summary: string;
  intent: string;
  temperature: "frio" | "morno" | "quente";
  objections: string[];
  nextStep: string;
  suggestedReplies: string[];
};

type ApiErrorPayload = {
  error?: string;
  code?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  const token = await getToken();

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const payload = isJson ? ((await response.json()) as ApiErrorPayload) : null;

    if (!response.ok) {
      if (response.status === 401) {
        await clearAuth();
        window.dispatchEvent(new CustomEvent("leadlink:session-expired"));
      }
      throw new ApiError(payload?.error || "Erro ao falar com o LeadLink.", response.status, payload?.code);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Tempo de conexao esgotado.", 408, "timeout");
    }
    throw new ApiError("Nao foi possivel conectar ao LeadLink.", 0, "network_error");
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function login(email: string, password: string) {
  const result = await request<{ token: string; user: ExtensionUser }>("/api/extension/auth", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await setToken(result.token);
  await setUser(result.user);
  return result;
}

export function me() {
  return request<{ user: ExtensionUser }>("/api/extension/me");
}

export function getLeads() {
  return request<{ leads: Lead[] }>("/api/extension/leads").then((result) => result.leads);
}

export function getLeadByPhone(phone: string) {
  return request<LeadByPhoneResponse>(`/api/extension/leads/by-phone/${encodeURIComponent(phone)}`);
}

export function getLeadById(leadId: string) {
  return request<{ lead: Lead }>(`/api/extension/leads/${encodeURIComponent(leadId)}`).then((result) => result.lead);
}

export function getProperties() {
  return request<{ properties: Property[] }>("/api/extension/properties").then((result) => result.properties);
}

export function getAppointments() {
  return request<{ appointments: Appointment[] }>("/api/extension/appointments").then((result) => result.appointments);
}

export function createAppointment(input: {
  title: string;
  type: AppointmentType;
  leadId?: string;
  leadName?: string;
  propertyId?: string;
  propertyTitle?: string;
  date: string;
  duration?: number;
  location?: string;
  notes?: string;
}) {
  return request<{ appointment: Appointment }>("/api/extension/appointments", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((result) => result.appointment);
}

export function createActivity(leadId: string, type: string, text: string) {
  return request<{ ok: true }>(`/api/extension/leads/${encodeURIComponent(leadId)}/activity`, {
    method: "POST",
    body: JSON.stringify({ type, text }),
  });
}

export async function recordLeadActivity(leadId: string | null | undefined, type: string, text: string) {
  if (!leadId) return;
  try {
    await createActivity(leadId, type, text);
  } catch {
    // Fire-and-forget: activity failures should never block the main user action.
  }
}

export function analyzeConversation(input: { leadId?: string; messages: ConversationMessage[] }) {
  return request<{ analysis: ConversationAnalysis }>("/api/extension/ai/analyze", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((result) => result.analysis);
}
