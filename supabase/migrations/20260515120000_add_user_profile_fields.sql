ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "public_name" text,
  ADD COLUMN IF NOT EXISTS "whatsapp" text,
  ADD COLUMN IF NOT EXISTS "main_city" text,
  ADD COLUMN IF NOT EXISTS "region_of_operation" text,
  ADD COLUMN IF NOT EXISTS "creci" text,
  ADD COLUMN IF NOT EXISTS "atuacao" text,
  ADD COLUMN IF NOT EXISTS "instagram" text,
  ADD COLUMN IF NOT EXISTS "avatar_url" text,
  ADD COLUMN IF NOT EXISTS "brokerage_name" text,
  ADD COLUMN IF NOT EXISTS "bio" text,
  ADD COLUMN IF NOT EXISTS "especialidades" jsonb,
  ADD COLUMN IF NOT EXISTS "slug" text,
  ADD COLUMN IF NOT EXISTS "profile_completed" boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "user_slug_unique" ON "user" ("slug");

ALTER TABLE "user"
  ADD CONSTRAINT "user_atuacao_check"
  CHECK ("atuacao" IS NULL OR "atuacao" IN ('locacao', 'venda', 'investimento', 'todos'));
