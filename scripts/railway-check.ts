import "dotenv/config";

const required = [
  "DATABASE_URL",
  "APP_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRO_PRICE_ID",
  "STRIPE_COMERCIAL_PRICE_ID",
] as const;

const placeholderValues = new Set([
  "change-me",
  "change-me-use-a-random-32-plus-character-secret",
  "sk_live_xxx",
  "whsec_xxx",
  "price_xxx",
]);

function valueFor(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function isPlaceholder(value: string): boolean {
  return placeholderValues.has(value) || value.includes("USER:PASSWORD@HOST:PORT");
}

const errors: string[] = [];

for (const key of required) {
  const value = valueFor(key);
  if (!value) {
    errors.push(`${key} nao configurada.`);
  } else if (isPlaceholder(value)) {
    errors.push(`${key} ainda esta com valor placeholder.`);
  }
}

if (valueFor("NODE_ENV") !== "production") {
  errors.push("NODE_ENV deve ser production.");
}

const databaseUrl = valueFor("DATABASE_URL");
if (databaseUrl && !databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
  errors.push("DATABASE_URL deve ser uma URL PostgreSQL valida.");
}

for (const key of ["APP_URL", "BETTER_AUTH_URL"] as const) {
  const value = valueFor(key);
  if (value) {
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) {
        errors.push(`${key} deve usar http ou https.`);
      }
      if (url.pathname !== "/" || url.search || url.hash) {
        errors.push(`${key} deve conter apenas a origem, sem path, query ou hash.`);
      }
    } catch {
      errors.push(`${key} deve ser uma URL valida.`);
    }
  }
}

const betterAuthSecret = valueFor("BETTER_AUTH_SECRET");
if (betterAuthSecret && betterAuthSecret.length < 32) {
  errors.push("BETTER_AUTH_SECRET deve ter pelo menos 32 caracteres.");
}

for (const key of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRO_PRICE_ID", "STRIPE_COMERCIAL_PRICE_ID"] as const) {
  if (!valueFor(key)) {
    errors.push(`${key} nao pode estar vazia.`);
  }
}

if (errors.length) {
  console.error("Railway check falhou:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Railway check OK: variaveis obrigatorias configuradas para producao.");
