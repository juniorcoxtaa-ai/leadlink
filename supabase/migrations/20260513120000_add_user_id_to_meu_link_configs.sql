alter table public.meu_link_configs
add column if not exists user_id text references public.user(id) on delete cascade;
