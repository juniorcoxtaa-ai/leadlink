-- Migration: add stripe_customer_id to organizations

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;
