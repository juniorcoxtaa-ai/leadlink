const RAILWAY_GRAPHQL_ENDPOINT = "https://backboard.railway.com/graphql/v2";

const RAILWAY_API_TOKEN = process.env.RAILWAY_API_TOKEN;
const RAILWAY_PROJECT_ID = process.env.RAILWAY_PROJECT_ID;
const RAILWAY_ENVIRONMENT_ID = process.env.RAILWAY_ENVIRONMENT_ID;
const RAILWAY_SERVICE_ID = process.env.RAILWAY_SERVICE_ID;

type RailwayGraphqlError = {
  message?: string;
};

type RailwayGraphqlResponse<T> = {
  data?: T;
  errors?: RailwayGraphqlError[];
};

type RailwayDnsRecordStatus = "PENDING" | "VALID" | "INVALID" | string;
type RailwayCertificateStatus = "PENDING" | "ISSUED" | "FAILED" | string | null;

type RailwayDnsRecordRaw = {
  currentValue?: string | null;
  fqdn?: string | null;
  hostlabel?: string | null;
  purpose?: string | null;
  recordType?: string | null;
  requiredValue?: string | null;
  status?: RailwayDnsRecordStatus | null;
  zone?: string | null;
};

type RailwayCustomDomainStatusRaw = {
  dnsRecords?: RailwayDnsRecordRaw[] | null;
  verificationToken?: string | null;
  certificateStatus?: RailwayCertificateStatus | null;
};

type RailwayCustomDomainRaw = {
  id?: string | null;
  domain?: string | null;
  edgeId?: string | null;
  serviceId?: string | null;
  environmentId?: string | null;
  projectId?: string | null;
  targetPort?: number | null;
  status?: RailwayCustomDomainStatusRaw | null;
};

type RailwayServiceDomainRaw = {
  id?: string | null;
  domain?: string | null;
};

export type RailwayDnsRecord = {
  currentValue: string | null;
  fqdn: string | null;
  hostlabel: string | null;
  purpose: string | null;
  recordType: string | null;
  requiredValue: string | null;
  status: RailwayDnsRecordStatus | null;
  zone: string | null;
};

export type RailwayCustomDomainSummary = {
  railwayDomainId: string;
  domain: string;
  dnsRecords: RailwayDnsRecord[];
  verificationToken: string | null;
  certificateStatus: RailwayCertificateStatus;
};

export type RailwayDomainListResult = {
  serviceDomains: Array<{
    id: string;
    domain: string;
  }>;
  customDomains: RailwayCustomDomainSummary[];
};

function requireRailwayToken() {
  if (!RAILWAY_API_TOKEN || !RAILWAY_API_TOKEN.trim()) {
    throw new Error("RAILWAY_API_TOKEN não configurado.");
  }
  return RAILWAY_API_TOKEN;
}

function requireRailwayIds() {
  if (!RAILWAY_PROJECT_ID || !RAILWAY_PROJECT_ID.trim()) {
    throw new Error("RAILWAY_PROJECT_ID não configurado.");
  }
  if (!RAILWAY_ENVIRONMENT_ID || !RAILWAY_ENVIRONMENT_ID.trim()) {
    throw new Error("RAILWAY_ENVIRONMENT_ID não configurado.");
  }
  if (!RAILWAY_SERVICE_ID || !RAILWAY_SERVICE_ID.trim()) {
    throw new Error("RAILWAY_SERVICE_ID não configurado.");
  }

  return {
    projectId: RAILWAY_PROJECT_ID,
    environmentId: RAILWAY_ENVIRONMENT_ID,
    serviceId: RAILWAY_SERVICE_ID,
  };
}

function normalizeDnsRecord(record: RailwayDnsRecordRaw): RailwayDnsRecord {
  return {
    currentValue: typeof record.currentValue === "string" ? record.currentValue : null,
    fqdn: typeof record.fqdn === "string" ? record.fqdn : null,
    hostlabel: typeof record.hostlabel === "string" ? record.hostlabel : null,
    purpose: typeof record.purpose === "string" ? record.purpose : null,
    recordType: typeof record.recordType === "string" ? record.recordType : null,
    requiredValue: typeof record.requiredValue === "string" ? record.requiredValue : null,
    status: typeof record.status === "string" ? record.status : null,
    zone: typeof record.zone === "string" ? record.zone : null,
  };
}

function normalizeCustomDomain(
  domain: RailwayCustomDomainRaw | null | undefined,
): RailwayCustomDomainSummary | null {
  const id = typeof domain?.id === "string" ? domain.id : null;
  const hostname = typeof domain?.domain === "string" ? domain.domain : null;
  if (!id || !hostname) return null;

  const dnsRecords = Array.isArray(domain?.status?.dnsRecords)
    ? domain.status.dnsRecords.map(normalizeDnsRecord)
    : [];

  return {
    railwayDomainId: id,
    domain: hostname,
    dnsRecords,
    verificationToken:
      typeof domain?.status?.verificationToken === "string"
        ? domain.status.verificationToken
        : null,
    certificateStatus:
      typeof domain?.status?.certificateStatus === "string"
        ? domain.status.certificateStatus
        : null,
  };
}

function normalizeServiceDomains(domains: RailwayServiceDomainRaw[] | null | undefined) {
  if (!Array.isArray(domains)) return [];
  return domains
    .filter((domain): domain is { id: string; domain: string } =>
      typeof domain.id === "string" && typeof domain.domain === "string",
    )
    .map((domain) => ({
      id: domain.id,
      domain: domain.domain,
    }));
}

export async function railwayGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const token = requireRailwayToken();

  const response = await fetch(RAILWAY_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Railway GraphQL HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as RailwayGraphqlResponse<T>;
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const message = payload.errors
      .map((error) => error.message?.trim())
      .filter((value): value is string => Boolean(value))
      .join(" | ");
    throw new Error(message || "Railway GraphQL retornou erro.");
  }

  if (payload.data === undefined) {
    throw new Error("Railway GraphQL retornou resposta sem data.");
  }

  return payload.data;
}

const LIST_RAILWAY_DOMAINS_QUERY = `
  query ServiceDomains($serviceId: String!) {
    service(id: $serviceId) {
      domains {
        serviceDomains {
          id
          domain
        }
        customDomains {
          id
          domain
          status {
            dnsRecords {
              currentValue
              fqdn
              hostlabel
              purpose
              recordType
              requiredValue
              status
              zone
            }
            verificationToken
            certificateStatus
          }
        }
      }
    }
  }
`;

const CREATE_RAILWAY_CUSTOM_DOMAIN_MUTATION = `
  mutation customDomainCreate($input: CustomDomainCreateInput!) {
    customDomainCreate(input: $input) {
      id
      domain
      edgeId
      status {
        dnsRecords {
          currentValue
          fqdn
          hostlabel
          purpose
          recordType
          requiredValue
          status
          zone
        }
        verificationToken
        certificateStatus
      }
    }
  }
`;

const GET_RAILWAY_CUSTOM_DOMAIN_QUERY = `
  query customDomain($id: String!, $projectId: String!) {
    customDomain(id: $id, projectId: $projectId) {
      id
      domain
      edgeId
      serviceId
      environmentId
      projectId
      targetPort
      status {
        dnsRecords {
          currentValue
          fqdn
          hostlabel
          purpose
          recordType
          requiredValue
          status
          zone
        }
        verificationToken
        certificateStatus
      }
    }
  }
`;

export async function listRailwayDomains(): Promise<RailwayDomainListResult> {
  const { serviceId } = requireRailwayIds();
  const data = await railwayGraphql<{
    service?: {
      domains?: {
        serviceDomains?: RailwayServiceDomainRaw[] | null;
        customDomains?: RailwayCustomDomainRaw[] | null;
      } | null;
    } | null;
  }>(LIST_RAILWAY_DOMAINS_QUERY, { serviceId });

  const customDomains = Array.isArray(data.service?.domains?.customDomains)
    ? data.service?.domains?.customDomains
        .map(normalizeCustomDomain)
        .filter((domain): domain is RailwayCustomDomainSummary => Boolean(domain))
    : [];

  return {
    serviceDomains: normalizeServiceDomains(data.service?.domains?.serviceDomains),
    customDomains,
  };
}

export async function createRailwayCustomDomain(
  domain: string,
): Promise<RailwayCustomDomainSummary> {
  const normalizedDomain = domain.trim().toLowerCase();
  if (!normalizedDomain) {
    throw new Error("Domínio inválido para cadastro na Railway.");
  }

  const { projectId, environmentId, serviceId } = requireRailwayIds();

  try {
    const data = await railwayGraphql<{
      customDomainCreate?: RailwayCustomDomainRaw | null;
    }>(CREATE_RAILWAY_CUSTOM_DOMAIN_MUTATION, {
      input: {
        projectId,
        environmentId,
        serviceId,
        domain: normalizedDomain,
      },
    });

    const normalized = normalizeCustomDomain(data.customDomainCreate ?? null);
    if (!normalized) {
      throw new Error("A Railway criou o domínio, mas não retornou dados suficientes.");
    }
    return normalized;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const looksLikeAlreadyExists =
      message.includes("already") ||
      message.includes("exists") ||
      message.includes("taken") ||
      message.includes("duplicate");

    if (!looksLikeAlreadyExists) {
      throw error;
    }

    const domains = await listRailwayDomains();
    const existing = domains.customDomains.find((item) => item.domain === normalizedDomain);
    if (existing) return existing;

    throw error;
  }
}

export async function getRailwayDomainStatus(
  domainOrId: string,
): Promise<RailwayCustomDomainSummary | null> {
  const value = domainOrId.trim();
  if (!value) return null;

  const { projectId } = requireRailwayIds();
  const looksLikeId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

  if (looksLikeId) {
    const data = await railwayGraphql<{
      customDomain?: RailwayCustomDomainRaw | null;
    }>(GET_RAILWAY_CUSTOM_DOMAIN_QUERY, {
      id: value,
      projectId,
    });
    return normalizeCustomDomain(data.customDomain ?? null);
  }

  const domains = await listRailwayDomains();
  return domains.customDomains.find((item) => item.domain === value.toLowerCase()) ?? null;
}
