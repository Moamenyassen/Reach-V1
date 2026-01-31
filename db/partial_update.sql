-- RUN THIS SCRIPT to just add the missing Logo features
-- It is safe to run even if you already have tables.

-- 1. Add 'logo_url' column to companies table if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'logo_url') then
    alter table companies add column logo_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'features') then
    alter table companies add column features text[];
  end if;
end $$;

-- 2. Create the Storage Bucket for Logos
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

-- 3. Allow Public Access to Logos
-- (Drop first to avoid "policy already exists" errors)
drop policy if exists "Public Access Logos" on storage.objects;
create policy "Public Access Logos"
on storage.objects for select
using ( bucket_id = 'company-logos' );

-- 4. Allow Authenticated Uploads
drop policy if exists "Authenticated Upload Logos" on storage.objects;
create policy "Authenticated Upload Logos"
on storage.objects for insert
with check ( bucket_id = 'company-logos' );

-- 5. (Optional) Allow Anonymous Uploads for easier testing
drop policy if exists "Anyone Upload Logos" on storage.objects;
create policy "Anyone Upload Logos"
on storage.objects for insert
with check ( bucket_id = 'company-logos' );
