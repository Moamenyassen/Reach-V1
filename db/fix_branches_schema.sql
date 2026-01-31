-- Robust Migration: Ensure 'company_branches' exists
-- Handles cases:
-- 1. 'branches' exists -> Rename to 'company_branches'
-- 2. 'company_branches' already exists -> Do nothing (idempotent)
-- 3. Neither exists -> Create 'company_branches' fresh
DO $$ BEGIN -- Check if 'company_branches' already exists
IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'company_branches'
) THEN RAISE NOTICE 'Table company_branches already exists. Skipping rename.';
-- Check if 'branches' exists (and 'company_branches' does not)
ELSIF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'branches'
) THEN
ALTER TABLE branches
    RENAME TO company_branches;
RAISE NOTICE 'Renamed branches to company_branches.';
-- Rename indexes if they exist
ALTER INDEX IF EXISTS idx_branches_code
RENAME TO idx_company_branches_code;
ALTER INDEX IF EXISTS idx_branches_company
RENAME TO idx_company_branches_company;
-- Neither exists -> Create fresh
ELSE CREATE TABLE company_branches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_ar TEXT,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_company_branches_code ON company_branches(code);
CREATE INDEX idx_company_branches_company ON company_branches(company_id);
RAISE NOTICE 'Created company_branches table fresh.';
END IF;
END $$;
-- Now safe to apply constraints and views (Idempotent checks)
-- 1. Update Routes FK
DO $$ BEGIN -- Drop old constraint if it exists
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_branch_id_fkey;
-- Add new constraint
ALTER TABLE routes
ADD CONSTRAINT routes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES company_branches(id) ON DELETE CASCADE;
EXCEPTION
WHEN undefined_table THEN RAISE NOTICE 'Routes table does not exist yet.';
END $$;
-- 2. Update Normalized Customers FK
DO $$ BEGIN
ALTER TABLE normalized_customers DROP CONSTRAINT IF EXISTS normalized_customers_branch_id_fkey;
ALTER TABLE normalized_customers
ADD CONSTRAINT normalized_customers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES company_branches(id) ON DELETE CASCADE;
EXCEPTION
WHEN undefined_table THEN RAISE NOTICE 'Normalized customers table does not exist yet.';
END $$;
-- 3. Update Policies
DROP POLICY IF EXISTS "branches_company_policy" ON company_branches;
DROP POLICY IF EXISTS "branches_public_access" ON company_branches;
-- ALSO Drop the NEW policy names if they exist (to fix 42710 error)
DROP POLICY IF EXISTS "company_branches_company_policy" ON company_branches;
DROP POLICY IF EXISTS "company_branches_public_access" ON company_branches;
ALTER TABLE company_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_branches_company_policy" ON company_branches FOR ALL USING (
    company_id = current_setting('app.company_id', true)::TEXT
    OR current_setting('app.is_sysadmin', true)::BOOLEAN = true
);
CREATE POLICY "company_branches_public_access" ON company_branches FOR ALL USING (true) WITH CHECK (true);
-- 4. Recreate Views (Drop first to avoid dependency errors)
DROP VIEW IF EXISTS v_route_schedule;
DROP VIEW IF EXISTS v_customer_summary;
DROP VIEW IF EXISTS v_route_summary;
-- Recreate v_route_schedule
CREATE OR REPLACE VIEW v_route_schedule AS
SELECT rv.id AS visit_id,
    rv.week_number,
    rv.day_name,
    rv.visit_order,
    rv.visit_type,
    rv.estimated_duration_min,
    r.id AS route_id,
    r.name AS route_name,
    r.rep_code,
    c.id AS customer_id,
    c.client_code,
    c.name_en AS customer_name_en,
    c.name_ar AS customer_name_ar,
    c.lat,
    c.lng,
    c.address,
    c.phone,
    c.classification,
    b.id AS branch_id,
    b.code AS branch_code,
    b.name_en AS branch_name,
    rv.company_id
FROM route_visits rv
    JOIN routes r ON rv.route_id = r.id
    JOIN normalized_customers c ON rv.customer_id = c.id
    JOIN company_branches b ON r.branch_id = b.id;
-- Recreate v_customer_summary
CREATE OR REPLACE VIEW v_customer_summary AS
SELECT c.id,
    c.client_code,
    c.name_en,
    c.name_ar,
    c.lat,
    c.lng,
    c.address,
    c.phone,
    c.classification,
    b.name_en AS branch_name,
    c.company_id,
    COUNT(rv.id) AS total_visits,
    STRING_AGG(DISTINCT r.name, ', ') AS assigned_routes
FROM normalized_customers c
    JOIN company_branches b ON c.branch_id = b.id
    LEFT JOIN route_visits rv ON rv.customer_id = c.id
    LEFT JOIN routes r ON rv.route_id = r.id
GROUP BY c.id,
    c.client_code,
    c.name_en,
    c.name_ar,
    c.lat,
    c.lng,
    c.address,
    c.phone,
    c.classification,
    b.name_en,
    c.company_id;
-- Recreate v_route_summary
CREATE OR REPLACE VIEW v_route_summary AS
SELECT r.id,
    r.name AS route_name,
    r.rep_code,
    b.name_en AS branch_name,
    r.company_id,
    COUNT(DISTINCT rv.customer_id) AS customer_count,
    COUNT(rv.id) AS total_visits,
    STRING_AGG(
        DISTINCT rv.day_name,
        ', '
        ORDER BY rv.day_name
    ) AS active_days
FROM routes r
    JOIN company_branches b ON r.branch_id = b.id
    LEFT JOIN route_visits rv ON rv.route_id = r.id
GROUP BY r.id,
    r.name,
    r.rep_code,
    b.name_en,
    r.company_id;