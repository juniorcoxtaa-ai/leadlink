-- Initial schema for a fresh Railway Postgres database.
-- Must run before the incremental migrations that alter "user" and "leads".

CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean NOT NULL DEFAULT false,
  "image" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "role" text NOT NULL DEFAULT 'corretor',
  "initials" text,
  "slug" text UNIQUE,
  "public_name" text,
  "whatsapp" text,
  "main_city" text,
  "region_of_operation" text,
  "atuacao" text,
  "instagram" text,
  "brokerage_name" text,
  "especialidades" jsonb
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "leads" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "email" text,
  "source" text NOT NULL DEFAULT 'Site',
  "status" text NOT NULL DEFAULT 'novo',
  "score" integer NOT NULL DEFAULT 50,
  "interest" text,
  "budget" text,
  "region" text,
  "timeline" text,
  "broker_id" text REFERENCES "user"("id"),
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "last_contact" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "activities" (
  "id" text PRIMARY KEY,
  "lead_id" text NOT NULL REFERENCES "leads"("id") ON DELETE cascade,
  "type" text NOT NULL,
  "text" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" text PRIMARY KEY,
  "lead_id" text NOT NULL REFERENCES "leads"("id") ON DELETE cascade,
  "from" text NOT NULL,
  "text" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "properties" (
  "id" text PRIMARY KEY,
  "code" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "type" text NOT NULL,
  "business_type" text,
  "cep" text,
  "street" text,
  "number" text,
  "complement" text,
  "state" text,
  "status" text NOT NULL DEFAULT 'Disponivel',
  "price" integer NOT NULL,
  "condo_value" integer,
  "iptu_value" integer,
  "area" integer NOT NULL,
  "bedrooms" integer NOT NULL DEFAULT 0,
  "bathrooms" integer NOT NULL DEFAULT 0,
  "parking" integer NOT NULL DEFAULT 0,
  "neighborhood" text NOT NULL,
  "city" text NOT NULL DEFAULT 'Sao Paulo',
  "broker_id" text REFERENCES "user"("id"),
  "image" text,
  "images" jsonb,
  "highlight" text,
  "description" text,
  "features" jsonb,
  "views" integer NOT NULL DEFAULT 0,
  "leads_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "appointments" (
  "id" text PRIMARY KEY,
  "title" text NOT NULL,
  "type" text NOT NULL,
  "lead_name" text NOT NULL,
  "lead_id" text REFERENCES "leads"("id"),
  "property_title" text,
  "property_id" text REFERENCES "properties"("id"),
  "broker_id" text REFERENCES "user"("id"),
  "date" timestamp NOT NULL,
  "duration" integer NOT NULL DEFAULT 60,
  "location" text,
  "status" text NOT NULL DEFAULT 'pendente',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "meu_link_configs" (
  "slug" text PRIMARY KEY,
  "user_id" text REFERENCES "user"("id") ON DELETE cascade,
  "data" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "integration_settings" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "type" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "config" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "integration_settings_user_type_unique"
  ON "integration_settings" ("user_id", "type");
