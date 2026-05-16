import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { BETTER_AUTH_SECRET, BETTER_AUTH_TRUSTED_ORIGINS, BETTER_AUTH_URL } from "@/config.server";

const trustedOrigins = Array.from(new Set([
  "http://localhost:8080",
  "http://localhost:3000",
  BETTER_AUTH_URL,
  ...BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
].filter(Boolean)));

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
