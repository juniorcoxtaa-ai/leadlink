ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "profile_completed" boolean NOT NULL DEFAULT false;
