drop policy if exists "Public read property-images" on storage.objects;
drop policy if exists "Anyone upload property-images" on storage.objects;
drop policy if exists "Anyone update property-images" on storage.objects;
drop policy if exists "Anyone delete property-images" on storage.objects;

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do update
set public = excluded.public;

create policy "Public read property-images"
  on storage.objects for select
  using (bucket_id = 'property-images');

create policy "Anyone upload property-images"
  on storage.objects for insert
  with check (bucket_id = 'property-images');

create policy "Anyone update property-images"
  on storage.objects for update
  using (bucket_id = 'property-images');

create policy "Anyone delete property-images"
  on storage.objects for delete
  using (bucket_id = 'property-images');
