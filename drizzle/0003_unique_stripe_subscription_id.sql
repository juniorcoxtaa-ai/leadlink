-- Migration: UNIQUE index on subscriptions.stripe_subscription_id to prevent duplicates on concurrent webhooks

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id
  ON "subscriptions" ("stripe_subscription_id")
  WHERE "stripe_subscription_id" IS NOT NULL;
