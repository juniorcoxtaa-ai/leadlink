CREATE TABLE IF NOT EXISTS "custom_domains" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "domain" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending_dns',
  "dns_target" text NOT NULL DEFAULT 'cname.leadlink.com.br',
  "railway_domain_id" text,
  "railway_certificate_status" text,
  "railway_verification_token" text,
  "railway_dns_records" jsonb,
  "error_message" text,
  "last_checked_at" timestamp,
  "verified_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "custom_domains_domain_unique"
  ON "custom_domains" ("domain");
