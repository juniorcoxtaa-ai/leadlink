import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { integrationSettings } from "@/db/schema";

type LeadPayload = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  region?: string | null;
  source: string;
  status: string;
  notes?: string | null;
  createdAt: Date | string;
};

type WebhookConfig = {
  url: string;
  events: Array<"lead.created">;
};

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;

  const [a, b] = octets;
  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function validateWebhookUrl(input: string) {
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      isPrivateIpv4(hostname)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function emitLeadCreatedWebhook(userId: string, lead: LeadPayload) {
  try {
    const [row] = await db
      .select({
        enabled: integrationSettings.enabled,
        config: integrationSettings.config,
      })
      .from(integrationSettings)
      .where(and(eq(integrationSettings.userId, userId), eq(integrationSettings.type, "webhook")));

    const config = (row?.config as WebhookConfig | null) || null;
    if (!row?.enabled || !config?.url) return;
    if (!config.events?.includes("lead.created")) return;

    await sendWebhook(config.url, {
      event: "lead.created",
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email || undefined,
        region: lead.region || undefined,
        source: lead.source,
        status: lead.status,
        notes: lead.notes || undefined,
        createdAt: typeof lead.createdAt === "string" ? lead.createdAt : lead.createdAt.toISOString(),
      },
    }, userId);
  } catch (error) {
    console.error("[emitLeadCreatedWebhook]", error);
  }
}

async function sendWebhook(url: string, payload: unknown, userId: string) {
  const parsedUrl = validateWebhookUrl(url);
  if (!parsedUrl) {
    console.error("[sendWebhook] Invalid or blocked webhook URL");
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(parsedUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-leadlink-user-id": userId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Webhook retornou status ${res.status}`);
  } catch (error) {
    console.error("[sendWebhook]", error);
  } finally {
    clearTimeout(timeout);
  }
}
