ALTER TABLE "properties"
ADD COLUMN IF NOT EXISTS "business_type" text;

ALTER TABLE "properties"
ADD COLUMN IF NOT EXISTS "cep" text;

ALTER TABLE "properties"
ADD COLUMN IF NOT EXISTS "street" text;

ALTER TABLE "properties"
ADD COLUMN IF NOT EXISTS "number" text;

ALTER TABLE "properties"
ADD COLUMN IF NOT EXISTS "complement" text;

ALTER TABLE "properties"
ADD COLUMN IF NOT EXISTS "state" text;

ALTER TABLE "properties"
ADD COLUMN IF NOT EXISTS "condo_value" integer;

ALTER TABLE "properties"
ADD COLUMN IF NOT EXISTS "iptu_value" integer;

ALTER TABLE "properties"
ADD COLUMN IF NOT EXISTS "description" text;

ALTER TABLE "properties"
ADD COLUMN IF NOT EXISTS "features" jsonb;
