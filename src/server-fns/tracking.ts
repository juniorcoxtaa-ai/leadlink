import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appSettings, integrationSettings, meuLinkConfigs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isValidMetaPixelId } from "@/lib/meta-pixel";

const GLOBAL_TRACKING_SETTINGS_KEY = "global_tracking_settings";
const BROKER_META_PIXEL_TYPE = "meta_pixel";

type TrackingSettingsRecord = {
  metaPixelId: string;
  metaConversionsApiToken: string;
  trackingEnabled: boolean;
  updatedAt: string;
};

export type TrackingSettingsInput = {
  metaPixelId: string;
  metaConversionsApiToken?: string;
  trackingEnabled: boolean;
};

export type PublicTrackingSettings = {
  pixelId: string | null;
  trackingEnabled: boolean;
};

export type AdminTrackingSettingsForUI = {
  metaPixelId: string;
  hasConversionsApiToken: boolean;
  trackingEnabled: boolean;
  updatedAt: string;
};

const EMPTY_TRACKING_SETTINGS: TrackingSettingsRecord = {
  metaPixelId: "",
  metaConversionsApiToken: "",
  trackingEnabled: false,
  updatedAt: new Date(0).toISOString(),
};

const trackingInputSchema = z.object({
  metaPixelId: z.string(),
  metaConversionsApiToken: z.string().optional(),
  trackingEnabled: z.boolean(),
});

async function requireSession() {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new Error("Não autenticado");
  return session;
}

async function requireAdminSession() {
  const session = await requireSession();
  if (session.user.role !== "admin") throw new Error("Sem permissão");
  return session;
}

function normalizeTrackingSettings(
  input: TrackingSettingsInput,
  existingToken = "",
): TrackingSettingsRecord {
  const metaPixelId = input.metaPixelId.trim();
  if (metaPixelId && !isValidMetaPixelId(metaPixelId)) {
    throw new Error("Informe um Meta Pixel ID numérico válido.");
  }

  return {
    metaPixelId,
    metaConversionsApiToken:
      input.metaConversionsApiToken === undefined
        ? existingToken
        : input.metaConversionsApiToken.trim(),
    trackingEnabled: input.trackingEnabled && metaPixelId.length > 0,
    updatedAt: new Date().toISOString(),
  };
}

function parseTrackingSettings(value: unknown): TrackingSettingsRecord {
  if (!value || typeof value !== "object") return EMPTY_TRACKING_SETTINGS;
  const raw = value as Partial<TrackingSettingsRecord>;
  const metaPixelId = typeof raw.metaPixelId === "string" ? raw.metaPixelId.trim() : "";
  const metaConversionsApiToken =
    typeof raw.metaConversionsApiToken === "string" ? raw.metaConversionsApiToken.trim() : "";
  const trackingEnabled = Boolean(raw.trackingEnabled) && isValidMetaPixelId(metaPixelId);
  const updatedAt =
    typeof raw.updatedAt === "string" && raw.updatedAt.trim().length > 0
      ? raw.updatedAt
      : EMPTY_TRACKING_SETTINGS.updatedAt;

  return {
    metaPixelId,
    metaConversionsApiToken,
    trackingEnabled,
    updatedAt,
  };
}

export const getAdminTrackingSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();

  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, GLOBAL_TRACKING_SETTINGS_KEY))
    .limit(1);

  return parseTrackingSettings(row?.value);
});

export const getAdminTrackingSettingsForUI = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, GLOBAL_TRACKING_SETTINGS_KEY))
    .limit(1);
  const parsed = parseTrackingSettings(row?.value);
  return {
    metaPixelId: parsed.metaPixelId,
    hasConversionsApiToken: parsed.metaConversionsApiToken.length > 0,
    trackingEnabled: parsed.trackingEnabled,
    updatedAt: parsed.updatedAt,
  } satisfies AdminTrackingSettingsForUI;
});

export const saveAdminTrackingSettings = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const parsed = trackingInputSchema.safeParse(ctx.data);
  if (!parsed.success) {
    throw new Error("Dados de rastreamento inválidos.");
  }

  await requireAdminSession();
  const [currentRow] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, GLOBAL_TRACKING_SETTINGS_KEY))
    .limit(1);
  const current = parseTrackingSettings(currentRow?.value);
  const payload = normalizeTrackingSettings(parsed.data, current.metaConversionsApiToken);

  const [row] = await db
    .insert(appSettings)
    .values({
      key: GLOBAL_TRACKING_SETTINGS_KEY,
      value: payload,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: payload,
        updatedAt: new Date(),
      },
    })
    .returning({ value: appSettings.value });

  return parseTrackingSettings(row.value);
});

export const getBrokerTrackingSettings = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireSession();
  const [row] = await db
    .select({
      enabled: integrationSettings.enabled,
      config: integrationSettings.config,
    })
    .from(integrationSettings)
    .where(
      and(
        eq(integrationSettings.userId, session.user.id),
        eq(integrationSettings.type, BROKER_META_PIXEL_TYPE),
      ),
    )
    .limit(1);

  if (!row) return EMPTY_TRACKING_SETTINGS;
  const parsed = parseTrackingSettings(row.config);
  return {
    ...parsed,
    trackingEnabled: row.enabled && parsed.trackingEnabled,
  };
});

export const saveBrokerTrackingSettings = createServerFn({ method: "POST" }).handler(
  async (ctx) => {
    const parsed = trackingInputSchema.safeParse(ctx.data);
    if (!parsed.success) {
      throw new Error("Dados de rastreamento inválidos.");
    }

    const session = await requireSession();
    const [currentRow] = await db
      .select({ config: integrationSettings.config })
      .from(integrationSettings)
      .where(
        and(
          eq(integrationSettings.userId, session.user.id),
          eq(integrationSettings.type, BROKER_META_PIXEL_TYPE),
        ),
      )
      .limit(1);
    const current = parseTrackingSettings(currentRow?.config);
    const payload = normalizeTrackingSettings(parsed.data, current.metaConversionsApiToken);

    const [row] = await db
      .insert(integrationSettings)
      .values({
        userId: session.user.id,
        type: BROKER_META_PIXEL_TYPE,
        enabled: payload.trackingEnabled,
        config: payload,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [integrationSettings.userId, integrationSettings.type],
        set: {
          enabled: payload.trackingEnabled,
          config: payload,
          updatedAt: new Date(),
        },
      })
      .returning({
        enabled: integrationSettings.enabled,
        config: integrationSettings.config,
      });

    const saved = parseTrackingSettings(row.config);
    return {
      ...saved,
      trackingEnabled: row.enabled && saved.trackingEnabled,
    };
  },
);

export const getPublicGlobalTrackingSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const [row] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, GLOBAL_TRACKING_SETTINGS_KEY))
      .limit(1);

    const parsed = parseTrackingSettings(row?.value);
    return {
      pixelId: parsed.trackingEnabled ? parsed.metaPixelId : null,
      trackingEnabled: parsed.trackingEnabled,
    } satisfies PublicTrackingSettings;
  },
);

export const getPublicBrokerTrackingSettings = createServerFn({ method: "GET" }).handler(
  async (ctx) => {
    const parsed = z.string().safeParse(ctx.data);
    if (!parsed.success) {
      return {
        pixelId: "",
        trackingEnabled: false,
      } satisfies PublicTrackingSettings;
    }

    const slug = parsed.data.trim();
    if (!slug) return { pixelId: null, trackingEnabled: false } satisfies PublicTrackingSettings;

    const [config] = await db
      .select({ userId: meuLinkConfigs.userId })
      .from(meuLinkConfigs)
      .where(eq(meuLinkConfigs.slug, slug))
      .limit(1);
    if (!config?.userId) {
      return { pixelId: null, trackingEnabled: false } satisfies PublicTrackingSettings;
    }

    const [row] = await db
      .select({
        enabled: integrationSettings.enabled,
        config: integrationSettings.config,
      })
      .from(integrationSettings)
      .where(
        and(
          eq(integrationSettings.userId, config.userId),
          eq(integrationSettings.type, BROKER_META_PIXEL_TYPE),
        ),
      )
      .limit(1);

    const settings = parseTrackingSettings(row?.config);
    return {
      pixelId: row?.enabled && settings.trackingEnabled ? settings.metaPixelId : null,
      trackingEnabled: row?.enabled === true && settings.trackingEnabled,
    } satisfies PublicTrackingSettings;
  },
);
