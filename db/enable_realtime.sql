-- Enable Realtime for all tables safely
-- This script checks if a table is already in the publication before adding it.
-- Use this to ensure ALL tables are enabled without errors.

-- 1. COMPANIES
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'companies') then
    alter publication supabase_realtime add table companies;
  end if;
end $$;

-- 2. APP_USERS
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'app_users') then
    alter publication supabase_realtime add table app_users;
  end if;
end $$;

-- 3. ROUTE_META
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'route_meta') then
    alter publication supabase_realtime add table route_meta;
  end if;
end $$;

-- 4. ROUTE_VERSIONS
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'route_versions') then
    alter publication supabase_realtime add table route_versions;
  end if;
end $$;

-- 5. ROUTE_DATA
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'customers') then
    alter publication supabase_realtime add table customers;
  end if;
end $$;

-- 6. HISTORY_LOGS
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'history_logs') then
    alter publication supabase_realtime add table history_logs;
  end if;
end $$;
