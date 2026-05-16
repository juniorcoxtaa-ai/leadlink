import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { integrationSettings } from "@/db/schema";

async function requireSession() {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new Error("Não autenticado");
  return session;
}

type WebhookConfig = {
  url: string;
  events: Array<"lead.created">;
};

export type WebhookSettings = {
  id: string;
  enabled: boolean;
  config: WebhookConfig | null;
};

export const getWebhookSettings: any = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireSession();
  const [row] = await db
    .select({
      id: integrationSettings.id,
      enabled: integrationSettings.enabled,
      config: integrationSettings.config,
    })
    .from(integrationSettings)
    .where(and(eq(integrationSettings.userId, session.user.id), eq(integrationSettings.type, "webhook")));

  return (row
    ? {
        id: row.id,
        enabled: row.enabled,
        config: (row.config as WebhookConfig | null) || null,
      }
    : {
        id: "",
        enabled: false,
        config: null,
      }) satisfies WebhookSettings;
});

export const saveWebhookSettings: any = createServerFn({ method: "POST" }).handler(async (ctx): Promise<any> => {
  const session = await requireSession();
  const data = ctx.data as unknown as { enabled: boolean; config: WebhookConfig };
  const [row] = await db
    .insert(integrationSettings)
    .values({
      userId: session.user.id,
      type: "webhook",
      enabled: data.enabled,
      config: data.config,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [integrationSettings.userId, integrationSettings.type],
      set: {
        enabled: data.enabled,
        config: data.config,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: integrationSettings.id,
      enabled: integrationSettings.enabled,
      config: integrationSettings.config,
    });

  return {
    id: row.id,
    enabled: row.enabled,
    config: (row.config as WebhookConfig | null) || null,
  } satisfies WebhookSettings;
});

export const testWebhookSettings: any = createServerFn({ method: "POST" }).handler(async (ctx): Promise<any> => {
  const session = await requireSession();
  const data = ctx.data as unknown as { url: string };
  const payload = {
    event: "lead.created",
    lead: {
      id: "test-lead",
      name: "Lead de teste",
      phone: "(00) 00000-0000",
      email: "teste@leadlink.com",
      region: "São Paulo",
      source: "LeadLink",
      status: "novo",
      notes: "Webhook de teste",
      createdAt: new Date().toISOString(),
    },
  };

  await sendWebhook(data.url, payload, session.user.id);
  return { ok: true };
});

async function sendWebhook(url: string, payload: unknown, userId: string) {
  if (!url) throw new Error("URL do webhook não informada");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-leadlink-user-id": userId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Webhook retornou status ${res.status}`);
  } finally {
    clearTimeout(timeout);
  }
}
