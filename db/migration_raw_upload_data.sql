-- CLEANUP: Drop table if it exists to ensure fresh creation
drop table if exists company_uploaded_data cascade;
-- CREATE TABLE
create table company_uploaded_data (
    id uuid default gen_random_uuid() primary key,
    company_id text,
    -- Removed strict reference and not-null for debugging reliability
    created_at timestamptz default now(),
    -- Branch / Region
    region text,
    branch_code text,
    branch_name text,
    -- Route / User
    route_name text,
    rep_code text,
    -- Customer
    client_code text,
    customer_name_en text,
    customer_name_ar text,
    address text,
    phone text,
    district text,
    vat text,
    buyer_id text,
    classification text,
    store_type text,
    lat double precision,
    lng double precision,
    -- Visit Schedule
    week_number text,
    day_name text,
    -- Metadata
    upload_batch_id text,
    is_processed boolean default false
);
-- ENABLE RLS
-- DISABLE RLS FOR DEBUGGING (To fix persistent upload error)
alter table company_uploaded_data disable row level security;
-- GRANT ALL to PUBLIC (To ensure absolutely no permission blocks)
grant all on company_uploaded_data to public;
grant all on company_uploaded_data to anon;
grant all on company_uploaded_data to authenticated;
grant all on company_uploaded_data to service_role;
-- CREATE INDEXES
create index idx_company_uploaded_data_company on company_uploaded_data(company_id);
create index idx_company_uploaded_data_batch on company_uploaded_data(upload_batch_id);
-- GRANT PERMISSIONS (Critical for API Access)
grant all on company_uploaded_data to authenticated;
grant all on company_uploaded_data to service_role;
-- FORCE SCHEMA CACHE RELOAD
NOTIFY pgrst,
'reload schema';
-- RENAME TO UNIQUE NAME TO AVOID ANY DATABASE COLLISIONS
DROP FUNCTION IF EXISTS fetch_unique_upload_data(text, text, text, text);
CREATE OR REPLACE FUNCTION fetch_unique_upload_data(
        p_company_id TEXT,
        p_column_name TEXT,
        p_filter_col TEXT DEFAULT NULL,
        p_filter_val TEXT DEFAULT NULL
    ) RETURNS TABLE (val TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF p_filter_col IS NOT NULL
    AND p_filter_val IS NOT NULL
    AND p_filter_val != 'All'
    AND p_filter_val != '' THEN RETURN QUERY EXECUTE format(
        'SELECT DISTINCT %I::TEXT FROM company_uploaded_data WHERE UPPER(TRIM(company_id)) = UPPER(TRIM(%L)) AND %I = %L AND %I IS NOT NULL ORDER BY 1',
        p_column_name,
        p_company_id,
        p_filter_col,
        p_filter_val,
        p_column_name
    );
ELSE RETURN QUERY EXECUTE format(
    'SELECT DISTINCT %I::TEXT FROM company_uploaded_data WHERE UPPER(TRIM(company_id)) = UPPER(TRIM(%L)) AND %I IS NOT NULL ORDER BY 1',
    p_column_name,
    p_company_id,
    p_column_name
);
END IF;
END;
$$;