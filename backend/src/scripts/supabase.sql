insert into storage.buckets (id, name)
  values ('images', 'images');

-- Set up access controls for storage.
-- See https://supabase.com/docs/guides/storage#policy-examples for more details.
create policy "Avatar images are publicly accessible." on storage.objects
  for select using (bucket_id = 'images');

create policy "Anyone can upload an avatar." on storage.objects
  for insert with check (bucket_id = 'images');

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;

-- https://github.com/supabase/storage-api/issues/65
alter table storage.objects
drop constraint objects_owner_fkey,
add constraint objects_owner_fkey
   foreign key (owner)
   references auth.users(id)
   on delete set null;