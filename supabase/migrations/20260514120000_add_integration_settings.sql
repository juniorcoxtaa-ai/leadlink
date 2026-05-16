create table if not exists "integration_settings" (
  "id" text primary key not null,
  "user_id" text not null references "user"("id") on delete cascade,
  "type" text not null,
  "enabled" boolean not null default false,
  "config" jsonb,
  "created_at" timestamp default now() not null,
  "updated_at" timestamp default now() not null
);

create index if not exists "integration_settings_user_id_idx" on "integration_settings" ("user_id");
create index if not exists "integration_settings_type_idx" on "integration_settings" ("type");
create unique index if not exists "integration_settings_user_type_unique" on "integration_settings" ("user_id", "type");
