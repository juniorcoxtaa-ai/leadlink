-- Migration: plans, organizations, subscriptions, payments
-- Run after the initial BetterAuth tables are created

-- ─── Plans ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "plans" (
  "id"                     TEXT PRIMARY KEY,
  "name"                   TEXT NOT NULL,
  "slug"                   TEXT NOT NULL UNIQUE,
  "description"            TEXT,
  "price_monthly"          INTEGER NOT NULL DEFAULT 0,
  "setup_fee"              INTEGER NOT NULL DEFAULT 0,
  "max_users"              INTEGER NOT NULL DEFAULT 1,
  "max_properties"         INTEGER NOT NULL DEFAULT 5,
  "max_leads_per_month"    INTEGER NOT NULL DEFAULT 30,
  "max_custom_forms"       INTEGER NOT NULL DEFAULT 0,
  "has_crm"                BOOLEAN NOT NULL DEFAULT FALSE,
  "has_advanced_dashboard" BOOLEAN NOT NULL DEFAULT FALSE,
  "has_custom_branding"    BOOLEAN NOT NULL DEFAULT FALSE,
  "has_team_management"    BOOLEAN NOT NULL DEFAULT FALSE,
  "has_lead_distribution"  BOOLEAN NOT NULL DEFAULT FALSE,
  "has_priority_support"   BOOLEAN NOT NULL DEFAULT FALSE,
  "show_leadlink_branding" BOOLEAN NOT NULL DEFAULT TRUE,
  "is_active"              BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"             TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"             TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Organizations ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "organizations" (
  "id"                  TEXT PRIMARY KEY,
  "name"                TEXT NOT NULL,
  "plan_id"             TEXT REFERENCES "plans"("id"),
  "subscription_status" TEXT NOT NULL DEFAULT 'free',
  "trial_ends_at"       TIMESTAMP,
  "created_at"          TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Add organization_id to user ─────────────────────────────────────────────

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "organization_id" TEXT REFERENCES "organizations"("id");

-- ─── Subscriptions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"                       TEXT PRIMARY KEY,
  "organization_id"          TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "plan_id"                  TEXT NOT NULL REFERENCES "plans"("id"),
  "stripe_customer_id"       TEXT,
  "stripe_subscription_id"   TEXT,
  "stripe_price_id"          TEXT,
  "status"                   TEXT NOT NULL DEFAULT 'active',
  "current_period_start"     TIMESTAMP,
  "current_period_end"       TIMESTAMP,
  "cancel_at_period_end"     BOOLEAN NOT NULL DEFAULT FALSE,
  "canceled_at"              TIMESTAMP,
  "trial_ends_at"            TIMESTAMP,
  "created_at"               TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"               TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Payments ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "payments" (
  "id"                        TEXT PRIMARY KEY,
  "organization_id"           TEXT NOT NULL REFERENCES "organizations"("id"),
  "subscription_id"           TEXT REFERENCES "subscriptions"("id"),
  "stripe_payment_intent_id"  TEXT,
  "amount_cents"              INTEGER NOT NULL,
  "currency"                  TEXT NOT NULL DEFAULT 'brl',
  "status"                    TEXT NOT NULL,
  "payment_method"            TEXT,
  "paid_at"                   TIMESTAMP,
  "created_at"                TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Seed: planos padrão ──────────────────────────────────────────────────────

INSERT INTO "plans" (
  "id", "name", "slug", "description",
  "price_monthly", "setup_fee",
  "max_users", "max_properties", "max_leads_per_month", "max_custom_forms",
  "has_crm", "has_advanced_dashboard", "has_custom_branding",
  "has_team_management", "has_lead_distribution", "has_priority_support",
  "show_leadlink_branding", "is_active"
) VALUES
(
  'plan_free', 'Free', 'free', 'Para teste inicial do corretor autônomo',
  0, 0,
  1, 5, 30, 0,
  FALSE, FALSE, FALSE,
  FALSE, FALSE, FALSE,
  TRUE, TRUE
),
(
  'plan_pro', 'Pro', 'pro', 'Para o corretor autônomo profissional',
  9700, 0,
  1, 50, 500, 3,
  TRUE, FALSE, TRUE,
  FALSE, FALSE, FALSE,
  FALSE, TRUE
),
(
  'plan_comercial', 'Comercial', 'comercial', 'Para imobiliárias e equipes comerciais',
  129000, 490000,
  15, 500, 5000, 20,
  TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  FALSE, TRUE
)
ON CONFLICT ("slug") DO NOTHING;
