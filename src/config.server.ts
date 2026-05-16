const e = (key: string, fallback = "") => process.env[key] || fallback;

export const DATABASE_URL = e("DATABASE_URL");
export const BETTER_AUTH_SECRET = e("BETTER_AUTH_SECRET");
export const BETTER_AUTH_URL = e("BETTER_AUTH_URL", "http://localhost:8080");
export const BETTER_AUTH_TRUSTED_ORIGINS = e("BETTER_AUTH_TRUSTED_ORIGINS");
export const APP_URL = e("APP_URL", "http://localhost:8080");
export const STRIPE_SECRET_KEY = e("STRIPE_SECRET_KEY");
export const STRIPE_WEBHOOK_SECRET = e("STRIPE_WEBHOOK_SECRET");
export const STRIPE_PRO_PRICE_ID = e("STRIPE_PRO_PRICE_ID");
export const STRIPE_COMERCIAL_PRICE_ID = e("STRIPE_COMERCIAL_PRICE_ID");
