import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  APP_URL,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_TRUSTED_ORIGINS,
  BETTER_AUTH_URL,
} from "@/config.server";

function originVariants(origin: string) {
  if (!origin) return [];
  try {
    const url = new URL(origin);
    const origins = [url.origin];
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.replace(/^www\./, "");
      origins.push(url.origin);
    } else {
      url.hostname = `www.${url.hostname}`;
      origins.push(url.origin);
    }
    return origins;
  } catch {
    return [origin];
  }
}

const configuredTrustedOrigins = BETTER_AUTH_TRUSTED_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const trustedOrigins = Array.from(
  new Set(
    [
      "http://localhost:8080",
      "http://localhost:3000",
      "https://leadlink.app.br",
      "https://www.leadlink.app.br",
      ...originVariants(BETTER_AUTH_URL),
      ...originVariants(APP_URL),
      ...configuredTrustedOrigins.flatMap(originVariants),
    ].filter(Boolean),
  ),
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: (password) => bcrypt.hash(password, 10),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  trustedOrigins,
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "corretor" },
      initials: { type: "string", required: false },
      organizationId: { type: "string", required: false },
      planSlug: { type: "string", required: false, defaultValue: "free" },
      planStatus: { type: "string", required: false, defaultValue: "free" },
      isBlocked: { type: "boolean", required: false, defaultValue: false },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
