
create table if not exists public.meu_link_configs (
  slug text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meu_link_configs enable row level security;

create policy "Public can read configs"
  on public.meu_link_configs for select
  using (true);

create policy "Anyone can insert configs"
  on public.meu_link_configs for insert
  with check (true);

create policy "Anyone can update configs"
  on public.meu_link_configs for update
  using (true) with check (true);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_meu_link_updated on public.meu_link_configs;
create trigger trg_meu_link_updated
  before update on public.meu_link_configs
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('meu-link', 'meu-link', true)
on conflict (id) do nothing;

create policy "Public read meu-link"
  on storage.objects for select
  using (bucket_id = 'meu-link');

create policy "Anyone upload meu-link"
  on storage.objects for insert
  with check (bucket_id = 'meu-link');

create policy "Anyone update meu-link"
  on storage.objects for update
  using (bucket_id = 'meu-link');

create policy "Anyone delete meu-link"
  on storage.objects for delete
  using (bucket_id = 'meu-link');
