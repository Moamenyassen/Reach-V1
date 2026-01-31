-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. COMPANIES Table
create table if not exists companies (
  id text primary key,
  name text not null,
  subscription_tier text default 'STARTER',
  max_users int default 5,
  is_active boolean default true,
  created_at timestamptz default now(),
  admin_username text,
  expiration_date timestamptz,
  last_upload_date timestamptz,
  last_upload_record_count int default 0,
  settings jsonb default '{}'::jsonb
);

-- Add missing columns safely
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'logo_url') then
    alter table companies add column logo_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'features') then
    alter table companies add column features text[];
  end if;
end $$;

-- 2. APP_USERS Table
create table if not exists app_users (
  id uuid default uuid_generate_v4() primary key,
  username text not null unique,
  password text not null,
  role text default 'USER',
  is_active boolean default true,
  company_id text references companies(id) on delete cascade,
  branch_ids text[],
  last_login timestamptz,
  created_at timestamptz default now()
);

-- 3. ROUTE_META Table
create table if not exists route_meta (
  company_id text references companies(id) on delete cascade primary key,
  active_version_id text,
  last_updated timestamptz
);

-- 4. ROUTE_VERSIONS Table
create table if not exists route_versions (
  id text not null,
  company_id text references companies(id) on delete cascade,
  upload_date timestamptz default now(),
  status text,
  record_count int,
  primary key (company_id, id)
);

-- 5. ROUTE_DATA Table
create table if not exists customers (
  id uuid default uuid_generate_v4() primary key,
  company_id text references companies(id) on delete cascade,
  version_id text not null,
  customer_id text,
  name text,
  lat double precision,
  lng double precision,
  address text,
  client_code text,
  route_name text,
  region_code text,
  region_description text,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Index for fast retrieval
create index if not exists idx_customers_version on customers(company_id, version_id);

-- 6. HISTORY_LOGS Table
create table if not exists history_logs (
  id uuid default uuid_generate_v4() primary key,
  company_id text references companies(id) on delete cascade,
  log_id text,
  file_name text,
  upload_date timestamptz,
  record_count int,
  uploader text,
  type text,
  stats jsonb,
  created_at timestamptz default now()
);

-- 7. STORAGE BUCKET (company-logos)
-- auto-create the bucket if possible (requires permissions)
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enabling RLS
alter table companies enable row level security;
alter table app_users enable row level security;
alter table route_meta enable row level security;
alter table route_versions enable row level security;
alter table customers enable row level security;
alter table history_logs enable row level security;

-- Re-create Policies (Drop first to avoid errors)
drop policy if exists "Allow all access" on companies;
create policy "Allow all access" on companies for all using (true) with check (true);

drop policy if exists "Allow all access" on app_users;
create policy "Allow all access" on app_users for all using (true) with check (true);

drop policy if exists "Allow all access" on route_meta;
create policy "Allow all access" on route_meta for all using (true) with check (true);

drop policy if exists "Allow all access" on route_versions;
create policy "Allow all access" on route_versions for all using (true) with check (true);

drop policy if exists "Allow all access" on customers;
create policy "Allow all access" on customers for all using (true) with check (true);

drop policy if exists "Allow all access" on history_logs;
create policy "Allow all access" on history_logs for all using (true) with check (true);

-- Storage Policies
-- Allow public access to logos
create policy "Public Access Logos"
on storage.objects for select
using ( bucket_id = 'company-logos' );

create policy "Authenticated Upload Logos"
on storage.objects for insert
with check ( bucket_id = 'company-logos' );

-- (Optional) If you want anyone to upload (including anon) during dev:
drop policy if exists "Anyone Upload Logos" on storage.objects;
create policy "Anyone Upload Logos"
on storage.objects for insert
with check ( bucket_id = 'company-logos' );
