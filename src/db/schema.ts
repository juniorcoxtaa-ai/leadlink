import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

type RailwayDnsRecordValue = {
  currentValue: string | null;
  fqdn: string | null;
  hostlabel: string | null;
  purpose: string | null;
  recordType: string | null;
  requiredValue: string | null;
  status: string | null;
  zone: string | null;
};

// ─── Plans ────────────────────────────────────────────────────────────────────

export const plans = pgTable("plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // "free" | "pro" | "comercial"
  description: text("description"),
  priceMonthly: integer("price_monthly").notNull().default(0), // centavos
  setupFee: integer("setup_fee").notNull().default(0), // centavos
  maxUsers: integer("max_users").notNull().default(1),
  maxProperties: integer("max_properties").notNull().default(5),
  maxLeadsPerMonth: integer("max_leads_per_month").notNull().default(30),
  maxCustomForms: integer("max_custom_forms").notNull().default(0),
  hasCrm: boolean("has_crm").notNull().default(false),
  hasAdvancedDashboard: boolean("has_advanced_dashboard").notNull().default(false),
  hasCustomBranding: boolean("has_custom_branding").notNull().default(false),
  hasTeamManagement: boolean("has_team_management").notNull().default(false),
  hasLeadDistribution: boolean("has_lead_distribution").notNull().default(false),
  hasPrioritySupport: boolean("has_priority_support").notNull().default(false),
  showLeadlinkBranding: boolean("show_leadlink_branding").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Organizations ────────────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  planId: text("plan_id").references(() => plans.id),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionStatus: text("subscription_status").notNull().default("free"),
  // free | active | trialing | past_due | unpaid | canceled
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Better Auth tables ───────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Extended fields
  role: text("role").notNull().default("corretor"),
  initials: text("initials"),
  organizationId: text("organization_id").references(() => organizations.id),
  slug: text("slug").unique(),
  publicName: text("public_name"),
  whatsapp: text("whatsapp"),
  mainCity: text("main_city"),
  regionOfOperation: text("region_of_operation"),
  atuacao: text("atuacao"),
  instagram: text("instagram"),
  brokerageName: text("brokerage_name"),
  especialidades: jsonb("especialidades"),
  displayName: text("display_name"),
  bio: text("bio"),
  creci: text("creci"),
  avatarUrl: text("avatar_url"),
  coverImageUrl: text("cover_image_url"),
  specialty: jsonb("specialty"),
  yearsExperience: integer("years_experience"),
  city: text("city"),
  state: text("state"),
  instagramUrl: text("instagram_url"),
  whatsappNumber: text("whatsapp_number"),
  websiteUrl: text("website_url"),
  cpfCnpj: text("cpf_cnpj"),
  billingName: text("billing_name"),
  billingEmail: text("billing_email"),
  billingAddressLine1: text("billing_address_line1"),
  billingAddressCity: text("billing_address_city"),
  billingAddressState: text("billing_address_state"),
  billingAddressZip: text("billing_address_zip"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  planSlug: text("plan_slug").notNull().default("free"),
  planAcquiredAt: timestamp("plan_acquired_at"),
  planExpiresAt: timestamp("plan_expires_at"),
  planStatus: text("plan_status").notNull().default("free"),
  paymentMethodLast4: text("payment_method_last4"),
  paymentMethodBrand: text("payment_method_brand"),
  isBlocked: boolean("is_blocked").notNull().default(false),
  blockedReason: text("blocked_reason"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  profileCompleteness: integer("profile_completeness").notNull().default(0),
  profileCompleted: boolean("profile_completed").notNull().default(false),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Leads ────────────────────────────────────────────────────────────────────

export const leads = pgTable("leads", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  intentType: text("intent_type"),
  quizAnswers: jsonb("quiz_answers"),
  source: text("source").notNull().default("Site"),
  status: text("status").notNull().default("novo"),
  score: integer("score").notNull().default(50),
  classification: text("classification").notNull().default("frio"),
  urgency: text("urgency").notNull().default("exploratorio"),
  budgetRange: text("budget_range").notNull().default("indefinido"),
  scoreDetail: jsonb("score_detail"),
  nextStep: text("next_step"),
  profileSummary: text("profile_summary"),
  interest: text("interest"),
  budget: text("budget"),
  region: text("region"),
  timeline: text("timeline"),
  brokerId: text("broker_id").references(() => user.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastContact: timestamp("last_contact").defaultNow(),
});

export const activities = pgTable("activities", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  from: text("from").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Imóveis ──────────────────────────────────────────────────────────────────

export const properties = pgTable("properties", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  businessType: text("business_type"),
  cep: text("cep"),
  street: text("street"),
  number: text("number"),
  complement: text("complement"),
  state: text("state"),
  status: text("status").notNull().default("Disponível"),
  price: integer("price").notNull(),
  condoValue: integer("condo_value"),
  iptuValue: integer("iptu_value"),
  area: integer("area").notNull(),
  bedrooms: integer("bedrooms").notNull().default(0),
  bathrooms: integer("bathrooms").notNull().default(0),
  parking: integer("parking").notNull().default(0),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").notNull().default("São Paulo"),
  brokerId: text("broker_id").references(() => user.id),
  image: text("image"),
  images: jsonb("images"),
  highlight: text("highlight"),
  description: text("description"),
  features: jsonb("features"),
  views: integer("views").notNull().default(0),
  leadsCount: integer("leads_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Agenda ───────────────────────────────────────────────────────────────────

export const appointments = pgTable("appointments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  type: text("type").notNull(),
  leadName: text("lead_name").notNull(),
  leadId: text("lead_id").references(() => leads.id),
  propertyTitle: text("property_title"),
  propertyId: text("property_id").references(() => properties.id),
  brokerId: text("broker_id").references(() => user.id),
  date: timestamp("date").notNull(),
  duration: integer("duration").notNull().default(60),
  location: text("location"),
  status: text("status").notNull().default("pendente"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Meu Link ─────────────────────────────────────────────────────────────────

export const meuLinkConfigs = pgTable("meu_link_configs", {
  slug: text("slug").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customDomains = pgTable(
  "custom_domains",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    status: text("status").notNull().default("pending_dns"),
    dnsTarget: text("dns_target").notNull().default("cname.leadlink.app.br"),
    railwayDomainId: text("railway_domain_id"),
    railwayCertificateStatus: text("railway_certificate_status"),
    railwayVerificationToken: text("railway_verification_token"),
    railwayDnsRecords: jsonb("railway_dns_records").$type<RailwayDnsRecordValue[] | null>(),
    errorMessage: text("error_message"),
    lastCheckedAt: timestamp("last_checked_at"),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    domainUnique: uniqueIndex("custom_domains_domain_unique").on(table.domain),
  }),
);

export const integrationSettings = pgTable(
  "integration_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    config: jsonb("config"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userTypeUnique: uniqueIndex("integration_settings_user_type_unique").on(
      table.userId,
      table.type,
    ),
  }),
);

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Subscriptions (Stripe-ready) ─────────────────────────────────────────────

export const subscriptions = pgTable("subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  // active | trialing | incomplete | past_due | unpaid | canceled
  status: text("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  canceledAt: timestamp("canceled_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Payments ─────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  subscriptionId: text("subscription_id").references(() => subscriptions.id),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("brl"),
  // succeeded | pending | failed
  status: text("status").notNull(),
  paymentMethod: text("payment_method"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof user.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type IntegrationSettings = typeof integrationSettings.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type CustomDomain = typeof customDomains.$inferSelect;
