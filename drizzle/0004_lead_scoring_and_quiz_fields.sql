ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "intent_type" text,
  ADD COLUMN IF NOT EXISTS "quiz_answers" jsonb,
  ADD COLUMN IF NOT EXISTS "classification" text NOT NULL DEFAULT 'frio',
  ADD COLUMN IF NOT EXISTS "urgency" text NOT NULL DEFAULT 'exploratorio',
  ADD COLUMN IF NOT EXISTS "budget_range" text NOT NULL DEFAULT 'indefinido',
  ADD COLUMN IF NOT EXISTS "score_detail" jsonb,
  ADD COLUMN IF NOT EXISTS "next_step" text,
  ADD COLUMN IF NOT EXISTS "profile_summary" text;
