import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => config,
}));

const mocks = vi.hoisted(() => ({
  requireExtensionSession: vi.fn(),
  jsonResponse: vi.fn((_: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status })),
  optionsResponse: vi.fn((_: Request) => new Response(null, { status: 204 })),
  errorResponse: vi.fn((_: Request, status: number, error: string, code?: string) =>
    new Response(JSON.stringify({ error, code }), { status })),
  withExtensionRouteErrorHandling: vi.fn(async (_request: Request, fn: () => Promise<Response>) => fn()),
  getExtensionUserById: vi.fn(),
  getLeadActivity: vi.fn(),
  matchBrazilianPhones: vi.fn(),
  possiblePhoneVariants: vi.fn(),
  auth: {
    api: {
      signInEmail: vi.fn(),
    },
  },
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("./-utils", () => ({
  db: mocks.db,
  eq: vi.fn((...args) => args),
  desc: vi.fn((...args) => args),
  jsonResponse: mocks.jsonResponse,
  optionsResponse: mocks.optionsResponse,
  errorResponse: mocks.errorResponse,
  withExtensionRouteErrorHandling: mocks.withExtensionRouteErrorHandling,
  requireExtensionSession: mocks.requireExtensionSession,
  getExtensionUserById: mocks.getExtensionUserById,
  getLeadActivity: mocks.getLeadActivity,
  matchBrazilianPhones: mocks.matchBrazilianPhones,
  possiblePhoneVariants: mocks.possiblePhoneVariants,
  sessions: { token: "token" },
  leads: { id: "id", brokerId: "broker_id", createdAt: "created_at", name: "name", phone: "phone" },
  properties: { brokerId: "broker_id", createdAt: "created_at" },
  activities: { leadId: "lead_id", createdAt: "created_at" },
  appointments: { brokerId: "broker_id", date: "date" },
  mapLead: vi.fn((lead) => lead),
  mapProperty: vi.fn((property) => property),
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => args),
  asc: vi.fn((...args) => args),
  desc: vi.fn((...args) => args),
  eq: vi.fn((...args) => args),
  gte: vi.fn((...args) => args),
}));

const authRoute = await import("./auth");
const meRoute = await import("./me");
const leadsRoute = await import("./leads");
const leadByIdRoute = await import("./leads.$id");
const leadByPhoneRoute = await import("./leads.by-phone.$phone");
const propertiesRoute = await import("./properties");
const appointmentsRoute = await import("./appointments");
const activityRoute = await import("./leads.$id.activity");
const aiAnalyzeRoute = await import("./ai.analyze");

function request(url = "http://localhost/api", init?: RequestInit) {
  return new Request(url, init);
}

function selectChain(rows: unknown) {
  return {
    from: () => ({
      where: () => ({
        orderBy: async () => rows,
        limit: async () => rows,
      }),
      orderBy: async () => rows,
      limit: async () => rows,
    }),
  };
}

function selectChainWithLimit(rows: unknown) {
  return {
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: async () => rows,
        }),
        limit: async () => rows,
      }),
      orderBy: () => ({
        limit: async () => rows,
      }),
      limit: async () => rows,
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("extension api routes", () => {
  it("auth returns 403 for user without allowed plan", async () => {
    mocks.auth.api.signInEmail.mockResolvedValue({ token: "t", user: { id: "u1" } });
    mocks.getExtensionUserById.mockResolvedValue(null);
    mocks.db.delete.mockReturnValue({ where: vi.fn() });
    const response = await authRoute.Route.server.handlers.POST({
      request: request("http://localhost/api/extension/auth", {
        method: "POST",
        body: JSON.stringify({ email: "a@a.com", password: "123" }),
      }),
    });
    expect(response.status).toBe(403);
  });

  it("me returns 401 without token", async () => {
    mocks.requireExtensionSession.mockResolvedValue({ response: new Response(null, { status: 401 }) });
    const response = await meRoute.Route.server.handlers.GET({ request: request() });
    expect(response.status).toBe(401);
  });

  it("me returns user for allowed plan", async () => {
    mocks.requireExtensionSession.mockResolvedValue({ session: { user: { id: "u1", planSlug: "pro" } } });
    const response = await meRoute.Route.server.handlers.GET({ request: request() });
    expect(response.status).toBe(200);
  });

  it("leads returns only broker leads", async () => {
    mocks.requireExtensionSession.mockResolvedValue({ session: { user: { id: "u1" } } });
    mocks.db.select.mockReturnValue(selectChainWithLimit([{ id: "l1" }]));
    const response = await leadsRoute.Route.server.handlers.GET({ request: request() });
    const body = await response.json();
    expect(body.leads).toEqual([{ id: "l1" }]);
  });

  it("lead detail returns 404 when broker does not own lead", async () => {
    mocks.requireExtensionSession.mockResolvedValue({ session: { user: { id: "u1" } } });
    mocks.db.select.mockReturnValue(selectChainWithLimit([]));
    const response = await leadByIdRoute.Route.server.handlers.GET({ request: request(), params: { id: "other" } });
    expect(response.status).toBe(404);
  });

  it("by-phone supports mask/no mask/55/ninth digit and returns false when not found", async () => {
    mocks.requireExtensionSession.mockResolvedValue({ session: { user: { id: "u1" } } });
    mocks.possiblePhoneVariants.mockReturnValue(["5511998765432", "11998765432"]);
    mocks.db.select.mockReturnValue(selectChain([{ id: "l1", phone: "1198765432", createdAt: new Date() }]));
    mocks.matchBrazilianPhones.mockImplementation((a, b) => String(a).includes("998") && String(b).includes("987"));
    mocks.getLeadActivity.mockResolvedValue([]);
    let response = await leadByPhoneRoute.Route.server.handlers.GET({ request: request(), params: { phone: "(11) 99876-5432" } });
    expect((await response.json()).found).toBe(true);
    mocks.matchBrazilianPhones.mockReturnValue(false);
    response = await leadByPhoneRoute.Route.server.handlers.GET({ request: request(), params: { phone: "5511998765432" } });
    expect((await response.json()).found).toBe(false);
  });

  it("properties require auth and return scoped data", async () => {
    mocks.requireExtensionSession.mockResolvedValue({ session: { user: { id: "u1" } } });
    mocks.db.select.mockReturnValue(selectChain([{ id: "p1", title: "Imovel" }]));
    const response = await propertiesRoute.Route.server.handlers.GET({ request: request() });
    expect((await response.json()).properties[0].id).toBe("p1");
  });

  it("appointments GET returns only future events", async () => {
    mocks.requireExtensionSession.mockResolvedValue({ session: { user: { id: "u1" } } });
    mocks.db.select.mockReturnValue(selectChainWithLimit([{ id: "a1", title: "Retorno", date: new Date(), type: "retorno" }]));
    const response = await appointmentsRoute.Route.server.handlers.GET({ request: request() });
    expect((await response.json()).appointments[0].id).toBe("a1");
  });

  it("appointments POST creates linked appointment for owned lead", async () => {
    mocks.requireExtensionSession.mockResolvedValue({ session: { user: { id: "u1" } } });
    mocks.db.select
      .mockReturnValueOnce(selectChainWithLimit([{ id: "l1", name: "Ana" }]));
    mocks.db.insert.mockReturnValue({
      values: () => ({
        returning: async () => [{ id: "a1", title: "Retorno", type: "retorno", leadId: "l1", leadName: "Ana", date: new Date() }],
      }),
    });
    const response = await appointmentsRoute.Route.server.handlers.POST({
      request: request("http://localhost/api/extension/appointments", {
        method: "POST",
        body: JSON.stringify({ title: "Retorno", type: "retorno", leadId: "l1", date: new Date().toISOString() }),
      }),
    });
    expect(response.status).toBe(201);
  });

  it("activity is created only for broker lead", async () => {
    mocks.requireExtensionSession.mockResolvedValue({ session: { user: { id: "u1" } } });
    mocks.db.select.mockReturnValueOnce(selectChainWithLimit([{ id: "l1" }]));
    mocks.db.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    let response = await activityRoute.Route.server.handlers.POST({
      request: request("http://localhost/api/extension/leads/l1/activity", {
        method: "POST",
        body: JSON.stringify({ type: "x", text: "y" }),
      }),
      params: { id: "l1" },
    });
    expect(response.status).toBe(200);

    mocks.db.select.mockReturnValueOnce(selectChainWithLimit([]));
    response = await activityRoute.Route.server.handlers.POST({
      request: request("http://localhost/api/extension/leads/x/activity", {
        method: "POST",
        body: JSON.stringify({ type: "x", text: "y" }),
      }),
      params: { id: "x" },
    });
    expect(response.status).toBe(404);
  });

  it("ai analyze returns 401 without token", async () => {
    mocks.requireExtensionSession.mockResolvedValue({ response: new Response(null, { status: 401 }) });
    const response = await aiAnalyzeRoute.Route.server.handlers.POST({
      request: request("http://localhost/api/extension/ai/analyze", {
        method: "POST",
        body: JSON.stringify({ messages: [{ from: "them", text: "Tenho interesse" }] }),
      }),
    });
    expect(response.status).toBe(401);
  });

  it("ai analyze returns 403 for plan without ia", async () => {
    mocks.requireExtensionSession.mockResolvedValue({ session: { user: { id: "u1", planSlug: "pro" } } });
    const response = await aiAnalyzeRoute.Route.server.handlers.POST({
      request: request("http://localhost/api/extension/ai/analyze", {
        method: "POST",
        body: JSON.stringify({ messages: [{ from: "them", text: "Tenho interesse" }] }),
      }),
    });
    expect(response.status).toBe(403);
  });

  it("ai analyze rejects empty messages", async () => {
    mocks.requireExtensionSession.mockResolvedValue({ session: { user: { id: "u1", planSlug: "comercial_ia" } } });
    const response = await aiAnalyzeRoute.Route.server.handlers.POST({
      request: request("http://localhost/api/extension/ai/analyze", {
        method: "POST",
        body: JSON.stringify({ messages: [] }),
      }),
    });
    expect(response.status).toBe(400);
  });

  it("ai analyze returns structured mock when OPENAI_API_KEY is absent", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    mocks.requireExtensionSession.mockResolvedValue({ session: { user: { id: "u1", planSlug: "comercial_ia" } } });

    const response = await aiAnalyzeRoute.Route.server.handlers.POST({
      request: request("http://localhost/api/extension/ai/analyze", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            { from: "them", text: "Gostei da regiao, voce consegue me mandar opcoes?" },
            { from: "me", text: "Claro, consigo sim." },
          ],
        }),
      }),
    });

    if (typeof originalKey === "string") process.env.OPENAI_API_KEY = originalKey;
    else delete process.env.OPENAI_API_KEY;
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.analysis.summary).toBeTruthy();
    expect(body.analysis.suggestedReplies).toHaveLength(3);
  });

  it("ai analyze uses OpenAI when OPENAI_API_KEY is present (mock fetch)", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test-key";
    mocks.requireExtensionSession.mockResolvedValue({ session: { user: { id: "u1", planSlug: "comercial_ia" } } });

    const openAiPayload = {
      summary: "Lead com interesse moderado em apartamento na regiao central.",
      intent: "Compra de imovel — busca ativa por opcoes.",
      temperature: "morno",
      objections: ["Sensibilidade a preco."],
      nextStep: "Enviar opcoes alinhadas ao perfil e faixa de valor.",
      suggestedReplies: [
        "Entendido! Vou separar as melhores opcoes para voce.",
        "Qual a faixa de valor que voce considera ideal?",
        "Posso te enviar algumas sugestoes agora mesmo.",
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify(openAiPayload) } }] }),
          { status: 200 },
        ),
      ),
    );

    const response = await aiAnalyzeRoute.Route.server.handlers.POST({
      request: request("http://localhost/api/extension/ai/analyze", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            { from: "them", text: "Voce tem apartamentos de 2 quartos no centro?" },
            { from: "me", text: "Sim, temos varias opcoes!" },
          ],
        }),
      }),
    });

    vi.unstubAllGlobals();
    if (typeof originalKey === "string") process.env.OPENAI_API_KEY = originalKey;
    else delete process.env.OPENAI_API_KEY;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.analysis.temperature).toBe("morno");
    expect(body.analysis.suggestedReplies).toHaveLength(3);
    expect(body.analysis.summary).toContain("interesse moderado");
  });

  it("ai analyze falls back to mock when OpenAI returns error", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test-key";
    mocks.requireExtensionSession.mockResolvedValue({ session: { user: { id: "u1", planSlug: "comercial_ia" } } });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "quota exceeded" }), { status: 429 })),
    );

    const response = await aiAnalyzeRoute.Route.server.handlers.POST({
      request: request("http://localhost/api/extension/ai/analyze", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ from: "them", text: "Tenho interesse no apartamento." }],
        }),
      }),
    });

    vi.unstubAllGlobals();
    if (typeof originalKey === "string") process.env.OPENAI_API_KEY = originalKey;
    else delete process.env.OPENAI_API_KEY;

    // Deve retornar 200 com mock (fallback no catch)
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.analysis.summary).toBeTruthy();
    expect(body.analysis.suggestedReplies).toHaveLength(3);
  });
});
