import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { customDomains, organizations, plans, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getEffectivePlanSlug, getPlanCapabilities } from "@/lib/plans";
import {
  createRailwayCustomDomain,
  getRailwayDomainStatus,
  isRailwayDomainAttachedToService,
} from "@/server/railway";

const DNS_TARGET = (process.env.CNAME_TARGET ?? "cname.leadlink.app.br").trim().toLowerCase();
const GOOGLE_DNS_ENDPOINT = "https://dns.google/resolve";
const REMOVED_STATUS = "removed";
const PENDING_DNS_STATUS = "pending_dns";
const PENDING_SSL_STATUS = "pending_ssl";
const ACTIVE_STATUS = "active";
const FAILED_STATUS = "failed";
const LEGACY_DNS_TARGETS = new Set(["cname.leadlink.app.br", "cname.leadlink.com.br"]);

const domainInputSchema = z.object({
  domain: z.string(),
});

type GoogleDnsAnswer = {
  data?: string;
  name?: string;
  TTL?: number;
  type?: number;
};

type GoogleDnsResponse = {
  Status?: number;
  Answer?: GoogleDnsAnswer[];
};

async function requireSession() {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new Error("Nao autenticado.");
  return session;
}

async function requireEligibleUser() {
  const session = await requireSession();
  const [currentUser] = await db
    .select({
      id: user.id,
      planSlug: user.planSlug,
      organizationPlanSlug: plans.slug,
    })
    .from(user)
    .leftJoin(organizations, eq(user.organizationId, organizations.id))
    .leftJoin(plans, eq(organizations.planId, plans.id))
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!currentUser) throw new Error("Usuario nao encontrado.");

  const effectivePlanSlug = getEffectivePlanSlug(currentUser);
  const capabilities = getPlanCapabilities(effectivePlanSlug);
  if (!capabilities.hasCustomDomain) {
    throw new Error("Seu plano atual nao inclui dominio proprio.");
  }

  return { session, currentUser, capabilities };
}

function normalizeDomain(input: string) {
  const compact = input.trim().toLowerCase().replace(/\s+/g, "");
  const withoutProtocol = compact.replace(/^https?:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0] ?? "";
  const withoutQuery = withoutPath.split("?")[0] ?? "";
  const withoutHash = withoutQuery.split("#")[0] ?? "";
  const withoutTrailingDot = withoutHash.replace(/\.+$/, "");
  return withoutTrailingDot.replace(/\/+$/, "");
}

function isValidDomainFormat(domain: string) {
  if (!domain || domain.length > 253) return false;
  if (domain.includes(":")) return false;
  if (!domain.includes(".")) return false;
  const labels = domain.split(".");
  if (labels.some((label) => label.length === 0 || label.length > 63)) return false;
  if (
    labels.some((label) => !/^[a-z0-9-]+$/.test(label) || label.startsWith("-") || label.endsWith("-"))
  ) {
    return false;
  }
  const tld = labels[labels.length - 1] ?? "";
  return /^[a-z]{2,63}$/.test(tld);
}

function normalizeDnsValue(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.+$/, "");
}

function isLegacyDnsTarget(value?: string | null) {
  const normalized = normalizeDnsValue(value);
  return !normalized || LEGACY_DNS_TARGETS.has(normalized);
}

function getPreferredDnsTargetFromRecord(currentDomain: {
  dnsTarget?: string | null;
  railwayDnsRecords?: Array<{
    recordType: string | null;
    requiredValue: string | null;
    purpose: string | null;
  }> | null;
}) {
  const railwayDnsRecords = Array.isArray(currentDomain.railwayDnsRecords)
    ? currentDomain.railwayDnsRecords
    : [];
  const railwayTarget = resolveDnsTargetFromRailwayRecords(railwayDnsRecords);
  const hasRailwayTarget = Boolean(railwayTarget) && !LEGACY_DNS_TARGETS.has(normalizeDnsValue(railwayTarget));

  if (hasRailwayTarget) {
    return railwayTarget;
  }

  if (!isLegacyDnsTarget(currentDomain.dnsTarget)) {
    return normalizeDnsValue(currentDomain.dnsTarget);
  }

  return "";
}

function getRailwayProvisioningErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return `O DNS foi validado, mas nao foi possivel provisionar o dominio na Railway agora. ${error.message}`;
  }

  return "O DNS foi validado, mas nao foi possivel provisionar o dominio na Railway agora.";
}

function getRailwayRegistrationErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("limit") &&
    normalizedMessage.includes("domain")
  ) {
    return "O limite de dominios da infraestrutura foi atingido no momento. Tente novamente mais tarde ou fale com o suporte.";
  }

  if (message.trim()) {
    return `Nao foi possivel cadastrar o dominio na infraestrutura agora. ${message}`;
  }

  return "Nao foi possivel cadastrar o dominio na infraestrutura agora.";
}

function resolveDnsTargetFromRailwayRecords(
  dnsRecords: Array<{
    recordType: string | null;
    requiredValue: string | null;
    purpose: string | null;
  }>,
) {
  const cnameRecord =
    dnsRecords.find(
      (record) =>
        record.recordType === "CNAME" &&
        typeof record.requiredValue === "string" &&
        record.requiredValue.trim().length > 0,
    ) ?? null;

  return cnameRecord?.requiredValue?.trim().toLowerCase() || DNS_TARGET;
}

async function resolveGoogleDns(name: string, type: "A" | "NS" | "CNAME") {
  const url = new URL(GOOGLE_DNS_ENDPOINT);
  url.searchParams.set("name", name);
  url.searchParams.set("type", type);

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/dns-json, application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar DNS (${response.status}).`);
  }

  return (await response.json()) as GoogleDnsResponse;
}

async function getCurrentNonRemovedDomain(userId: string) {
  const [row] = await db
    .select()
    .from(customDomains)
    .where(and(eq(customDomains.userId, userId), ne(customDomains.status, REMOVED_STATUS)))
    .orderBy(desc(customDomains.updatedAt), desc(customDomains.createdAt))
    .limit(1);
  return row ?? null;
}

async function resolveRailwayProvisionedDomain(currentDomain: {
  domain: string;
  railwayDomainId: string | null;
}): Promise<{
  railwayDomain: Awaited<ReturnType<typeof createRailwayCustomDomain>>;
  resetRailwayLink: boolean;
}> {
  if (currentDomain.railwayDomainId) {
    try {
      const railwayDomain = await getRailwayDomainStatus(currentDomain.railwayDomainId);
      const isAttached = await isRailwayDomainAttachedToService(currentDomain.domain);
      if (railwayDomain && isAttached) {
        console.info("[custom-domain] railway domain attached successfully", {
          domain: currentDomain.domain,
          railwayDomainId: currentDomain.railwayDomainId,
        });
        return { railwayDomain, resetRailwayLink: false };
      }
      if (railwayDomain && !isAttached) {
        console.info("[custom-domain] railway domain not attached, recreating", {
          domain: currentDomain.domain,
          railwayDomainId: currentDomain.railwayDomainId,
        });
      }
    } catch {
      // Fallback to recreation below when the old Railway link is no longer valid.
    }
    console.info("[custom-domain] railway domain missing, recreating", {
      domain: currentDomain.domain,
      railwayDomainId: currentDomain.railwayDomainId,
    });
    return {
      railwayDomain: await createRailwayCustomDomain(currentDomain.domain),
      resetRailwayLink: true,
    };
  }

  return {
    railwayDomain: await createRailwayCustomDomain(currentDomain.domain),
    resetRailwayLink: false,
  };
}

export const getMyCustomDomain = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireSession();
  const row = await getCurrentNonRemovedDomain(session.user.id);
  return row;
});

const _registerCustomDomain = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const parsed = domainInputSchema.safeParse(ctx.data);
  if (!parsed.success) {
    throw new Error("Dominio invalido.");
  }

  const { session } = await requireEligibleUser();
  const domain = normalizeDomain(parsed.data.domain);
  if (!isValidDomainFormat(domain)) {
    throw new Error("Informe um dominio valido.");
  }

  const currentDomain = await getCurrentNonRemovedDomain(session.user.id);
  if (currentDomain) {
    throw new Error("Voce ja possui um dominio proprio em andamento. Remova o atual para cadastrar outro.");
  }

  const [existingDomainRecord] = await db
    .select({
      id: customDomains.id,
      userId: customDomains.userId,
      status: customDomains.status,
      railwayDomainId: customDomains.railwayDomainId,
    })
    .from(customDomains)
    .where(eq(customDomains.domain, domain))
    .limit(1);

  if (existingDomainRecord && existingDomainRecord.userId !== session.user.id) {
    throw new Error("Este dominio ja esta em uso por outro usuario.");
  }

  if (
    existingDomainRecord &&
    existingDomainRecord.userId === session.user.id &&
    existingDomainRecord.status !== REMOVED_STATUS
  ) {
    throw new Error("Este dominio ja esta cadastrado na sua conta.");
  }

  const now = new Date();

  try {
    const railwayProvisioning =
      existingDomainRecord &&
      existingDomainRecord.userId === session.user.id &&
      existingDomainRecord.status === REMOVED_STATUS
        ? (console.info("[custom-domain] reusing removed domain", {
            domain,
            railwayDomainId: existingDomainRecord.railwayDomainId,
          }),
          await resolveRailwayProvisionedDomain({
            domain,
            railwayDomainId: existingDomainRecord.railwayDomainId,
          }))
        : {
            railwayDomain: await createRailwayCustomDomain(domain),
            resetRailwayLink: false,
          };
    const railwayDomain = railwayProvisioning.railwayDomain;
    const certificateStatus = railwayDomain.certificateStatus;
    const nextStatus = certificateStatus === "ISSUED" ? ACTIVE_STATUS : PENDING_DNS_STATUS;
    const dnsTargetFromRailway = resolveDnsTargetFromRailwayRecords(railwayDomain.dnsRecords);

    if (
      existingDomainRecord &&
      existingDomainRecord.userId === session.user.id &&
      existingDomainRecord.status === REMOVED_STATUS
    ) {
      if (railwayProvisioning.resetRailwayLink) {
        await db
          .update(customDomains)
          .set({
            railwayDomainId: null,
            railwayCertificateStatus: null,
            railwayVerificationToken: null,
            railwayDnsRecords: null,
            updatedAt: now,
          })
          .where(eq(customDomains.id, existingDomainRecord.id));
      }

      const [reactivated] = await db
        .update(customDomains)
        .set({
          status: nextStatus,
          dnsTarget: dnsTargetFromRailway,
          railwayDomainId: railwayDomain.railwayDomainId,
          railwayCertificateStatus: certificateStatus,
          railwayVerificationToken: railwayDomain.verificationToken,
          railwayDnsRecords: railwayDomain.dnsRecords,
          errorMessage: null,
          lastCheckedAt: null,
          verifiedAt: certificateStatus === "ISSUED" ? now : null,
          updatedAt: now,
        })
        .where(eq(customDomains.id, existingDomainRecord.id))
        .returning();

      return {
        ...reactivated,
        dnsTarget: reactivated.dnsTarget,
      };
    }

    const [created] = await db
      .insert(customDomains)
      .values({
        userId: session.user.id,
        domain,
        status: nextStatus,
        dnsTarget: dnsTargetFromRailway,
        railwayDomainId: railwayDomain.railwayDomainId,
        railwayCertificateStatus: certificateStatus,
        railwayVerificationToken: railwayDomain.verificationToken,
        railwayDnsRecords: railwayDomain.dnsRecords,
        errorMessage: null,
        lastCheckedAt: null,
        verifiedAt: certificateStatus === "ISSUED" ? now : null,
        updatedAt: now,
      })
      .returning();

    return {
      ...created,
      status: nextStatus,
      dnsTarget: created.dnsTarget,
    };
  } catch (error) {
    const message = getRailwayRegistrationErrorMessage(error);
    if (
      existingDomainRecord &&
      existingDomainRecord.userId === session.user.id &&
      existingDomainRecord.status === REMOVED_STATUS
    ) {
      const [failedReactivation] = await db
        .update(customDomains)
        .set({
          status: FAILED_STATUS,
          dnsTarget: "",
          railwayDomainId: null,
          railwayCertificateStatus: null,
          railwayVerificationToken: null,
          railwayDnsRecords: null,
          errorMessage: message,
          lastCheckedAt: now,
          verifiedAt: null,
          updatedAt: now,
        })
        .where(eq(customDomains.id, existingDomainRecord.id))
        .returning();

      return {
        ...failedReactivation,
        dnsTarget: failedReactivation.dnsTarget,
      };
    }

    const [failedRecord] = await db
      .insert(customDomains)
      .values({
        userId: session.user.id,
        domain,
        status: FAILED_STATUS,
        dnsTarget: "",
        railwayDomainId: null,
        railwayCertificateStatus: null,
        railwayVerificationToken: null,
        railwayDnsRecords: null,
        errorMessage: message,
        lastCheckedAt: now,
        verifiedAt: null,
        updatedAt: now,
      })
      .returning();

    return {
      ...failedRecord,
      dnsTarget: failedRecord.dnsTarget,
    };
  }
});

export const registerCustomDomain = _registerCustomDomain as unknown as (opts: {
  data: { domain: string };
}) => ReturnType<typeof _registerCustomDomain>;

const _removeCustomDomain = createServerFn({ method: "POST" }).handler(async () => {
  const session = await requireSession();
  const currentDomain = await getCurrentNonRemovedDomain(session.user.id);
  if (!currentDomain) {
    return { ok: true, removed: false };
  }

  const [updated] = await db
    .update(customDomains)
    .set({
      status: REMOVED_STATUS,
      errorMessage: null,
      lastCheckedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(customDomains.id, currentDomain.id))
    .returning();

  return { ok: true, removed: Boolean(updated) };
});

export const removeCustomDomain = _removeCustomDomain as unknown as () => ReturnType<
  typeof _removeCustomDomain
>;

const _checkDomainDns = createServerFn({ method: "POST" }).handler(async () => {
  const { session } = await requireEligibleUser();
  const currentDomain = await getCurrentNonRemovedDomain(session.user.id);
  if (!currentDomain) {
    throw new Error("Nenhum dominio proprio cadastrado.");
  }

  const now = new Date();
  let currentDnsTarget = getPreferredDnsTargetFromRecord(currentDomain);

  try {
    if (currentDomain.railwayDomainId) {
      const railwayDomain = await getRailwayDomainStatus(currentDomain.railwayDomainId);
      if (railwayDomain) {
        const railwayDnsTarget = resolveDnsTargetFromRailwayRecords(railwayDomain.dnsRecords);
        if (!isLegacyDnsTarget(railwayDnsTarget)) {
          const [synced] = await db
            .update(customDomains)
            .set({
              dnsTarget: railwayDnsTarget,
              railwayDnsRecords: railwayDomain.dnsRecords,
              railwayCertificateStatus: railwayDomain.certificateStatus,
              railwayVerificationToken: railwayDomain.verificationToken,
              updatedAt: now,
            })
            .where(eq(customDomains.id, currentDomain.id))
            .returning();

          currentDnsTarget = synced?.dnsTarget ?? railwayDnsTarget;
        }
      }
    }

    if (!currentDnsTarget) {
      if (!currentDomain.railwayDomainId) {
        throw new Error(
          "Este dominio ainda usa configuracao antiga. Remova e cadastre novamente para gerar os registros corretos.",
        );
      }

      const railwayDomain = await getRailwayDomainStatus(currentDomain.railwayDomainId);
      if (!railwayDomain) {
        throw new Error("Nao foi possivel localizar este dominio na Railway agora.");
      }

      const refreshedDnsTarget = resolveDnsTargetFromRailwayRecords(railwayDomain.dnsRecords);
      const [refreshed] = await db
        .update(customDomains)
        .set({
          dnsTarget: refreshedDnsTarget,
          railwayCertificateStatus: railwayDomain.certificateStatus,
          railwayVerificationToken: railwayDomain.verificationToken,
          railwayDnsRecords: railwayDomain.dnsRecords,
          lastCheckedAt: now,
          updatedAt: now,
        })
        .where(eq(customDomains.id, currentDomain.id))
        .returning();

      currentDnsTarget = refreshed?.dnsTarget ?? refreshedDnsTarget;
    }

    if (isLegacyDnsTarget(currentDnsTarget)) {
      throw new Error(
        "Nao foi possivel obter o destino atual da Railway. Remova e cadastre o dominio novamente.",
      );
    }

    const response = await resolveGoogleDns(currentDomain.domain, "CNAME");
    const answers = Array.isArray(response.Answer) ? response.Answer : [];
    const normalizedExpectedTarget = normalizeDnsValue(currentDnsTarget);
    const resolvedCnameValues = answers
      .filter((answer) => answer.type === 5 || typeof answer.data === "string")
      .map((answer) => normalizeDnsValue(answer.data));

    console.info("[dns-check] expected target", {
      hostname: currentDomain.domain,
      expectedTarget: currentDnsTarget,
      normalizedExpectedTarget,
    });
    console.info("[dns-check] resolved cname", {
      hostname: currentDomain.domain,
      answers,
      resolvedCnameValues,
    });

    const matchesTarget = answers.some(
      (answer) =>
        (answer.type === 5 || typeof answer.data === "string") &&
        normalizeDnsValue(answer.data) === normalizedExpectedTarget,
    );

    console.info("[dns-check] normalized comparison", {
      hostname: currentDomain.domain,
      normalizedExpectedTarget,
      resolvedCnameValues,
      matchesTarget,
    });

    if (!matchesTarget) {
      const message =
        answers.length === 0
          ? "Ainda nao encontramos o destino correto da Railway no DNS publico. A propagacao DNS pode levar alguns minutos ou horas."
          : "O dominio ainda nao aponta para o destino correto da Railway. Atualize o CNAME e aguarde a propagacao DNS.";

      const [updated] = await db
        .update(customDomains)
        .set({
          status: FAILED_STATUS,
          errorMessage: message,
          lastCheckedAt: now,
          updatedAt: now,
        })
        .where(eq(customDomains.id, currentDomain.id))
        .returning();

      return {
        ok: false,
        status: FAILED_STATUS,
        dnsTarget: updated?.dnsTarget ?? currentDnsTarget,
        domain: currentDomain.domain,
        message,
        record: updated ?? currentDomain,
      };
    }

    if (!currentDomain.railwayDomainId) {
      const message =
        "O dominio ainda nao foi cadastrado na infraestrutura. Cadastre novamente o dominio para gerar os registros corretos.";

      const [updated] = await db
        .update(customDomains)
        .set({
          status: FAILED_STATUS,
          errorMessage: message,
          lastCheckedAt: now,
          updatedAt: now,
        })
        .where(eq(customDomains.id, currentDomain.id))
        .returning();

      return {
        ok: false,
        status: FAILED_STATUS,
        dnsTarget: updated?.dnsTarget ?? currentDnsTarget,
        domain: currentDomain.domain,
        message,
        record: updated ?? currentDomain,
      };
    }

    const railwayDomain = await getRailwayDomainStatus(currentDomain.railwayDomainId);
    if (!railwayDomain) {
      throw new Error("Nao foi possivel localizar este dominio na Railway agora.");
    }

    const certificateStatus = railwayDomain.certificateStatus;
    const nextStatus = certificateStatus === "ISSUED" ? ACTIVE_STATUS : PENDING_SSL_STATUS;
    const dnsTargetFromRailway = resolveDnsTargetFromRailwayRecords(railwayDomain.dnsRecords);

    const [updated] = await db
      .update(customDomains)
      .set({
        status: nextStatus,
        dnsTarget: dnsTargetFromRailway,
        railwayCertificateStatus: certificateStatus,
        railwayVerificationToken: railwayDomain.verificationToken,
        railwayDnsRecords: railwayDomain.dnsRecords,
        verifiedAt: certificateStatus === "ISSUED" ? now : null,
        lastCheckedAt: now,
        errorMessage: certificateStatus === "ISSUED" ? null : null,
        updatedAt: now,
      })
      .where(eq(customDomains.id, currentDomain.id))
      .returning();

    return {
      ok: certificateStatus === "ISSUED",
      status: nextStatus,
      dnsTarget: updated?.dnsTarget ?? currentDnsTarget,
      domain: currentDomain.domain,
      message:
        certificateStatus === "ISSUED"
          ? "Dominio verificado e ativado com sucesso."
          : "DNS validado com sucesso. Agora estamos aguardando a emissao do certificado SSL.",
      record: updated ?? currentDomain,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? `Nao foi possivel verificar o DNS agora. ${error.message}`
        : "Nao foi possivel verificar o DNS agora.";

    const [updated] = await db
      .update(customDomains)
      .set({
        status: FAILED_STATUS,
        errorMessage: message,
        lastCheckedAt: now,
        updatedAt: now,
      })
      .where(eq(customDomains.id, currentDomain.id))
      .returning();

    return {
      ok: false,
      status: FAILED_STATUS,
      dnsTarget: updated?.dnsTarget ?? currentDnsTarget,
      domain: currentDomain.domain,
      message,
      record: updated ?? currentDomain,
    };
  }
});

export const checkDomainDns = _checkDomainDns as unknown as () => ReturnType<typeof _checkDomainDns>;

const _refreshCustomDomainStatus = createServerFn({ method: "POST" }).handler(async () => {
  const { session } = await requireEligibleUser();
  const currentDomain = await getCurrentNonRemovedDomain(session.user.id);
  if (!currentDomain) {
    throw new Error("Nenhum dominio proprio cadastrado.");
  }

  if (!currentDomain.railwayDomainId) {
    throw new Error("Verifique o DNS primeiro para cadastrar o dominio na Railway.");
  }

  const now = new Date();
  try {
    const railwayDomain = await getRailwayDomainStatus(currentDomain.railwayDomainId);
    if (!railwayDomain) {
      throw new Error("Nao foi possivel localizar este dominio na Railway agora.");
    }

    const certificateStatus = railwayDomain.certificateStatus;

    let nextStatus = PENDING_SSL_STATUS;
    let verifiedAt: Date | null = null;
    let errorMessage: string | null = null;

    if (certificateStatus === "ISSUED") {
      nextStatus = ACTIVE_STATUS;
      verifiedAt = now;
    } else if (certificateStatus === "FAILED") {
      nextStatus = FAILED_STATUS;
      errorMessage =
        "O certificado SSL nao foi emitido pela Railway ainda. Revise os registros do dominio e tente novamente em alguns minutos.";
    }

    const [updated] = await db
      .update(customDomains)
      .set({
        status: nextStatus,
        railwayCertificateStatus: certificateStatus,
        railwayVerificationToken: railwayDomain.verificationToken,
        railwayDnsRecords: railwayDomain.dnsRecords,
        lastCheckedAt: now,
        verifiedAt,
        errorMessage,
        updatedAt: now,
      })
      .where(eq(customDomains.id, currentDomain.id))
      .returning();

    return updated ?? currentDomain;
  } catch (error) {
    const message =
      error instanceof Error
        ? `Nao foi possivel atualizar o status do dominio na Railway agora. ${error.message}`
        : "Nao foi possivel atualizar o status do dominio na Railway agora.";

    const [updated] = await db
      .update(customDomains)
      .set({
        status: currentDomain.status === ACTIVE_STATUS ? ACTIVE_STATUS : PENDING_SSL_STATUS,
        errorMessage: message,
        lastCheckedAt: now,
        updatedAt: now,
      })
      .where(eq(customDomains.id, currentDomain.id))
      .returning();

    return updated ?? currentDomain;
  }
});

export const refreshCustomDomainStatus = _refreshCustomDomainStatus as unknown as () => ReturnType<
  typeof _refreshCustomDomainStatus
>;

const _checkDomainAvailability = createServerFn({ method: "POST" }).handler(async (ctx) => {
  await requireSession();

  const parsed = domainInputSchema.safeParse(ctx.data);
  if (!parsed.success) {
    return {
      status: "invalid_format" as const,
      domain: "",
      isApproximate: true,
      message: "Formato de dominio invalido.",
      purchaseLinks: {
        registroBr: "https://registro.br",
        hostinger: "https://www.hostinger.com.br/registro-de-dominio",
        goDaddy: "https://br.godaddy.com/domains",
      },
    };
  }

  const domain = normalizeDomain(parsed.data.domain);
  if (!isValidDomainFormat(domain)) {
    return {
      status: "invalid_format" as const,
      domain,
      isApproximate: true,
      message: "Formato de dominio invalido.",
      purchaseLinks: {
        registroBr: "https://registro.br",
        hostinger: "https://www.hostinger.com.br/registro-de-dominio",
        goDaddy: "https://br.godaddy.com/domains",
      },
    };
  }

  try {
    const [aRecords, nsRecords] = await Promise.all([
      resolveGoogleDns(domain, "A"),
      resolveGoogleDns(domain, "NS"),
    ]);

    const hasA = Array.isArray(aRecords.Answer) && aRecords.Answer.length > 0;
    const hasNs = Array.isArray(nsRecords.Answer) && nsRecords.Answer.length > 0;
    const likelyTaken = hasA || hasNs || aRecords.Status === 0 || nsRecords.Status === 0;

    return {
      status: likelyTaken ? ("likely_taken" as const) : ("likely_available" as const),
      domain,
      isApproximate: true,
      message: likelyTaken
        ? "Este dominio parece ja estar em uso ou delegado. A verificacao e aproximada e pode divergir do registrador."
        : "Este dominio parece disponivel. A verificacao e aproximada e deve ser confirmada no registrador.",
      purchaseLinks: {
        registroBr: "https://registro.br",
        hostinger: "https://www.hostinger.com.br/registro-de-dominio",
        goDaddy: "https://br.godaddy.com/domains",
      },
      diagnostics: {
        hasARecords: hasA,
        hasNsRecords: hasNs,
      },
    };
  } catch {
    return {
      status: "likely_available" as const,
      domain,
      isApproximate: true,
      message:
        "Nao foi possivel concluir a consulta DNS agora. A disponibilidade precisa ser confirmada no registrador.",
      purchaseLinks: {
        registroBr: "https://registro.br",
        hostinger: "https://www.hostinger.com.br/registro-de-dominio",
        goDaddy: "https://br.godaddy.com/domains",
      },
    };
  }
});

export const checkDomainAvailability = _checkDomainAvailability as unknown as (opts: {
  data: { domain: string };
}) => ReturnType<typeof _checkDomainAvailability>;
