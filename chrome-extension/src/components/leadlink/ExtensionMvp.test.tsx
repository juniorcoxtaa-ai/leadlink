import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiView, LeadLinkExtensionMvp } from "@/components/leadlink/ExtensionMvp";

const apiMocks = vi.hoisted(() => ({
  me: vi.fn(),
  analyzeConversation: vi.fn(),
  getLeadByPhone: vi.fn(),
  getLeadById: vi.fn(),
  getLeads: vi.fn(),
  getProperties: vi.fn(),
  getAppointments: vi.fn(),
  createAppointment: vi.fn(),
  recordLeadActivity: vi.fn(),
  login: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  getUser: vi.fn(),
  getQuickReplies: vi.fn(),
  getCurrentPhone: vi.fn(),
  clearAuth: vi.fn(),
  setCurrentPhone: vi.fn(),
  setQuickReplies: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, ...apiMocks };
});

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return { ...actual, ...storageMocks };
});

function setWhatsappState(response: { tabState: "WHATSAPP_TAB" | "NOT_WHATSAPP_TAB"; phone?: string | null }) {
  chrome.runtime.sendMessage = vi.fn((message, callback) => {
    const payload = message as { type?: string };
    if (payload.type === "LEADLINK_GET_WHATSAPP_STATE") callback?.(response);
    if (payload.type === "LEADLINK_GET_CURRENT_PHONE") callback?.({ phone: response.phone || null });
  }) as never;
}

function setWhatsappStateWithMessages(response: {
  tabState: "WHATSAPP_TAB" | "NOT_WHATSAPP_TAB";
  phone?: string | null;
  messages?: Array<{ from: "me" | "them"; text: string; time?: string }>;
}) {
  chrome.runtime.sendMessage = vi.fn((message, callback) => {
    const payload = message as { type?: string };
    if (payload.type === "LEADLINK_GET_WHATSAPP_STATE") callback?.(response);
    if (payload.type === "LEADLINK_READ_WHATSAPP_MESSAGES") {
      callback?.({ type: "WHATSAPP_MESSAGES_READ", messages: response.messages || [] });
    }
  }) as never;
}

function disableChromeRuntime() {
  // Force the component to use the storage fallback path in tests.
  (chrome.runtime as unknown as { onMessage?: unknown }).onMessage = undefined;
}

const user = { id: "u1", name: "Broker", email: "broker@test.com" };
const lead = {
  id: "l1",
  name: "Ana Paula",
  phone: "11998765432",
  status: "Interessado",
  classification: "quente",
  createdAt: "2026-05-15T10:00:00.000Z",
  lastContact: "2026-05-10T10:00:00.000Z",
  activity: [],
};

beforeEach(() => {
  (chrome.runtime as unknown as { onMessage?: unknown }).onMessage = {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };
  storageMocks.getToken.mockResolvedValue("token");
  storageMocks.getUser.mockResolvedValue(user);
  storageMocks.getQuickReplies.mockResolvedValue(null);
  storageMocks.getCurrentPhone.mockResolvedValue(null);
  apiMocks.me.mockResolvedValue({ user });
  apiMocks.analyzeConversation.mockResolvedValue({
    summary: "Lead avaliando opcoes e pedindo sugestoes.",
    intent: "Receber opcoes alinhadas ao perfil.",
    temperature: "morno",
    objections: ["Quer entender melhor regiao e faixa de valor."],
    nextStep: "Confirmar bairro e orcamento antes de enviar imoveis.",
    suggestedReplies: ["Resposta 1", "Resposta 2", "Resposta 3"],
  });
  apiMocks.getLeads.mockResolvedValue([lead]);
  apiMocks.getLeadById.mockResolvedValue(lead);
  apiMocks.getProperties.mockResolvedValue([]);
  apiMocks.getAppointments.mockResolvedValue([]);
  apiMocks.createAppointment.mockResolvedValue({ id: "a1", type: "retorno", title: "Retorno", leadId: "l1", date: "2026-05-20T10:00:00.000Z" });
  apiMocks.recordLeadActivity.mockResolvedValue(undefined);
});

describe("LeadLinkExtensionMvp", () => {
  it("shows login without token", async () => {
    storageMocks.getToken.mockResolvedValue(null);
    setWhatsappState({ tabState: "WHATSAPP_TAB" });
    render(<LeadLinkExtensionMvp />);
    expect(await screen.findByText("Acesse sua conta")).toBeInTheDocument();
  });

  it("shows whatsapp required state outside WhatsApp Web", async () => {
    setWhatsappState({ tabState: "NOT_WHATSAPP_TAB" });
    render(<LeadLinkExtensionMvp />);
    expect(await screen.findByText(/Abra o WhatsApp Web/i)).toBeInTheDocument();
    expect(apiMocks.me).not.toHaveBeenCalled();
    expect(apiMocks.getLeads).not.toHaveBeenCalled();
    expect(apiMocks.getLeadByPhone).not.toHaveBeenCalled();
    expect(apiMocks.getAppointments).not.toHaveBeenCalled();
  });

  it("shows no active conversation when whatsapp has no phone", async () => {
    disableChromeRuntime();
    render(<LeadLinkExtensionMvp />);
    expect(await screen.findByText(/Nenhuma conversa ativa/i)).toBeInTheDocument();
  });

  it("shows lead details when a lead is found", async () => {
    setWhatsappState({ tabState: "WHATSAPP_TAB", phone: "11998765432" });
    apiMocks.getLeadByPhone.mockResolvedValue({ found: true, lead });
    render(<LeadLinkExtensionMvp />);
    expect(await screen.findByText("Ana Paula")).toBeInTheDocument();
  });

  it("shows unidentified contact state", async () => {
    disableChromeRuntime();
    storageMocks.getCurrentPhone.mockResolvedValue("11998765432");
    apiMocks.getLeadByPhone.mockResolvedValue({ found: false });
    render(<LeadLinkExtensionMvp />);
    expect(await screen.findByText(/Contato nao identificado/i)).toBeInTheDocument();
  });

  it("renders leads tab and opens lead detail on click", async () => {
    disableChromeRuntime();
    storageMocks.getCurrentPhone.mockResolvedValue("11998765432");
    apiMocks.getLeadByPhone.mockResolvedValue({ found: false });
    render(<LeadLinkExtensionMvp />);
    fireEvent.click(await screen.findByText("Leads"));
    fireEvent.click(await screen.findByText("Ana Paula"));
    expect(await screen.findAllByText("Ana Paula")).not.toHaveLength(0);
  });

  it("renders follow-up and copies message", async () => {
    disableChromeRuntime();
    storageMocks.getCurrentPhone.mockResolvedValue("11998765432");
    apiMocks.getLeadByPhone.mockResolvedValue({ found: true, lead });
    render(<LeadLinkExtensionMvp />);
    fireEvent.click(await screen.findByText("Follow-up"));
    expect(await screen.findByText(/Sugestao de mensagem/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Copiar mensagem"));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
  });

  it("renders agenda form and appointments", async () => {
    disableChromeRuntime();
    storageMocks.getCurrentPhone.mockResolvedValue("11998765432");
    apiMocks.getLeadByPhone.mockResolvedValue({ found: true, lead });
    apiMocks.getAppointments.mockResolvedValue([{ id: "a1", title: "Visita teste", type: "visita", leadName: "Ana Paula", date: "2026-05-20T10:00:00.000Z" }]);
    render(<LeadLinkExtensionMvp />);
    fireEvent.click(await screen.findByText("Agenda"));
    expect(await screen.findByText("Criar agendamento")).toBeInTheDocument();
    expect(screen.getByText("Visita teste")).toBeInTheDocument();
  });

  it("renders ia loading, analysis and copies suggested reply", async () => {
    const onAnalyze = vi.fn().mockResolvedValue(undefined);
    const onActivity = vi.fn();

    const { rerender } = render(
      <AiView
        currentLead={lead}
        hasConversation
        planSlug="comercial_ia"
        onAnalyze={onAnalyze}
        loading={false}
        error={null}
        analysis={null}
        onActivity={onActivity}
      />,
    );

    fireEvent.click(screen.getByText("Analisar conversa"));
    expect(onAnalyze).toHaveBeenCalled();

    rerender(
      <AiView
        currentLead={lead}
        hasConversation
        planSlug="comercial_ia"
        onAnalyze={onAnalyze}
        loading={false}
        error={null}
        analysis={{
          summary: "Lead avaliando opcoes e pedindo sugestoes.",
          intent: "Receber opcoes alinhadas ao perfil.",
          temperature: "morno",
          objections: ["Quer entender melhor regiao e faixa de valor."],
          nextStep: "Confirmar bairro e orcamento antes de enviar imoveis.",
          suggestedReplies: ["Resposta 1", "Resposta 2", "Resposta 3"],
        }}
        onActivity={onActivity}
      />,
    );

    expect(await screen.findByText("Lead avaliando opcoes e pedindo sugestoes.")).toBeInTheDocument();
    fireEvent.click(screen.getAllByText("Copiar")[0]);
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Resposta 1"));
    expect(onActivity).toHaveBeenCalledWith("l1", "extension_ai_reply_copied", "Resposta sugerida por IA copiada");
  });
});
