import "./lib/error-capture";

import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { customDomains, meuLinkConfigs } from "./db/schema";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { auth } from "./lib/auth";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

const APP_HOSTNAME = process.env.APP_HOSTNAME ?? "leadlink.app.br";
const KNOWN_SUFFIXES = ["localhost", "railway.app", "up.railway.app", APP_HOSTNAME];
const DOMAIN_CACHE_TTL = 30_000;
const domainCache = new Map<string, { slug: string | null; expiresAt: number }>();

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function isMainAppHost(host: string): boolean {
  const normalizedHost = host.trim().toLowerCase();
  const normalizedAppHost = APP_HOSTNAME.trim().toLowerCase().replace(/^www\./, "");
  if (!normalizedHost) return true;
  if (
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost.endsWith(".localhost")
  ) {
    return true;
  }
  if (normalizedHost === normalizedAppHost || normalizedHost === `www.${normalizedAppHost}`) return true;
  if (normalizedHost.endsWith(`.${normalizedAppHost}`)) return true;
  if (KNOWN_SUFFIXES.some((suffix) => normalizedHost === suffix || normalizedHost.endsWith(`.${suffix}`))) {
    return true;
  }
  return false;
}

async function resolveCustomDomainSlug(host: string): Promise<string | null> {
  const normalizedHost = host.trim().toLowerCase();
  const now = Date.now();
  const cached = domainCache.get(normalizedHost);
  if (cached && cached.expiresAt > now) {
    return cached.slug;
  }

  try {
    const [domainRow] = await db
      .select({
        userId: customDomains.userId,
      })
      .from(customDomains)
      .where(and(eq(customDomains.domain, normalizedHost), eq(customDomains.status, "active")))
      .limit(1);

    if (!domainRow?.userId) {
      domainCache.set(normalizedHost, { slug: null, expiresAt: now + DOMAIN_CACHE_TTL });
      return null;
    }

    const [slugRow] = await db
      .select({
        slug: meuLinkConfigs.slug,
      })
      .from(meuLinkConfigs)
      .where(eq(meuLinkConfigs.userId, domainRow.userId))
      .limit(1);

    const slug = slugRow?.slug ?? null;
    domainCache.set(normalizedHost, { slug, expiresAt: now + DOMAIN_CACHE_TTL });
    return slug;
  } catch (error) {
    console.error("[LeadLink][custom-domain] failed to resolve slug", { host: normalizedHost, error });
    return null;
  }
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const reqUrl = new URL(request.url);
      const host = reqUrl.hostname.toLowerCase();

      if (!isMainAppHost(host)) {
        const slug = await resolveCustomDomainSlug(host);
        if (!slug) {
          return new Response("Domínio não configurado", { status: 404 });
        }

        let rewrittenPath = `/l/${slug}/vitrine`;
        if (reqUrl.pathname.startsWith(`/l/${slug}`)) {
          rewrittenPath = reqUrl.pathname;
        } else if (/^\/imovel\/[^/]+\/?$/.test(reqUrl.pathname)) {
          const propertyId = reqUrl.pathname.split("/")[2] ?? "";
          rewrittenPath = `/l/${slug}/vitrine/${propertyId}`;
        }

        const rewrittenUrl = new URL(request.url);
        rewrittenUrl.pathname = rewrittenPath;
        rewrittenUrl.search = reqUrl.search;

        const rewrittenHeaders = new Headers(request.headers);
        rewrittenHeaders.set("x-custom-domain", host);
        rewrittenHeaders.set("x-broker-slug", slug);

        const rewrittenRequest = new Request(rewrittenUrl.toString(), {
          method: request.method,
          headers: rewrittenHeaders,
          body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
          redirect: request.redirect,
          signal: request.signal,
        });

        const handler = await getServerEntry();
        const response = await handler.fetch(rewrittenRequest, env, ctx);
        return await normalizeCatastrophicSsrResponse(response);
      }

      if (reqUrl.pathname.startsWith("/api/auth")) {
        return auth.handler(request);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
