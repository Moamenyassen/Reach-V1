-- =================================================================
-- REACH V1: MIGRATION TO TEXT-BASED COMPANY ID (FIX V4 - FINAL)
-- =================================================================
-- Rationale: The application uses License Keys (e.g. "LICENSE-...") 
-- as company IDs. This script converts all relevant tables to accept 
-- TEXT for company_id.
--
-- FIXES: 
-- 1. Handling "cannot alter type of a column used in a policy" (RLS)
-- 2. Handling "cannot alter type of a column used by a view" (Views)
-- 3. Handling missing "normalized_routes"
-- =================================================================
BEGIN;
-- 1. DROP DEPENDENT VIEWS (CASCADE to handle nested dependencies)
DROP VIEW IF EXISTS view_branch_stats CASCADE;
DROP VIEW IF EXISTS view_route_performance CASCADE;
DROP VIEW IF EXISTS v_route_schedule CASCADE;
DROP VIEW IF EXISTS v_customer_summary CASCADE;
DROP VIEW IF EXISTS v_route_summary CASCADE;
-- 2. DROP CONFLICTING RLS POLICIES & CONSTRAINTS
DROP POLICY IF EXISTS "Update Own Company" ON companies;
DROP POLICY IF EXISTS "Hybrid Isolation Customers" ON customers;
DROP POLICY IF EXISTS "Hybrid Isolation Routes" ON route_meta;
DROP POLICY IF EXISTS "Restricted Write Users" ON app_users;
DROP POLICY IF EXISTS "Safe delete companies" ON companies;
DROP POLICY IF EXISTS "branches_company_policy" ON branches;
DROP POLICY IF EXISTS "routes_company_policy" ON routes;
DROP POLICY IF EXISTS "normalized_customers_company_policy" ON normalized_customers;
DROP POLICY IF EXISTS "route_visits_company_policy" ON route_visits;
-- 3. Detach Foreign Keys
DO $$ BEGIN -- companies / branches
ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_company_id_fkey;
-- routes
ALTER TABLE IF EXISTS routes DROP CONSTRAINT IF EXISTS routes_company_id_fkey;
ALTER TABLE IF EXISTS normalized_routes DROP CONSTRAINT IF EXISTS normalized_routes_company_id_fkey;
-- customers
ALTER TABLE IF EXISTS normalized_customers DROP CONSTRAINT IF EXISTS normalized_customers_company_id_fkey;
ALTER TABLE IF EXISTS customers DROP CONSTRAINT IF EXISTS customers_company_id_fkey;
-- visits
ALTER TABLE IF EXISTS route_visits DROP CONSTRAINT IF EXISTS route_visits_company_id_fkey;
-- reps
ALTER TABLE IF EXISTS normalized_reps DROP CONSTRAINT IF EXISTS normalized_reps_company_id_fkey;
-- versions
ALTER TABLE IF EXISTS route_versions DROP CONSTRAINT IF EXISTS route_versions_company_id_fkey;
END $$;
-- 4. Alter 'companies' table (Principal)
ALTER TABLE companies
ALTER COLUMN id TYPE TEXT;
ALTER TABLE companies
ALTER COLUMN id DROP DEFAULT;
-- 5. Alter 'app_users'
ALTER TABLE app_users
ALTER COLUMN company_id TYPE TEXT;
-- 6. Alter Dependent Tables
ALTER TABLE branches
ALTER COLUMN company_id TYPE TEXT;
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'normalized_routes'
) THEN
ALTER TABLE normalized_routes
ALTER COLUMN company_id TYPE TEXT;
END IF;
IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'routes'
) THEN
ALTER TABLE routes
ALTER COLUMN company_id TYPE TEXT;
END IF;
END $$;
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'normalized_customers'
) THEN
ALTER TABLE normalized_customers
ALTER COLUMN company_id TYPE TEXT;
END IF;
IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'customers'
) THEN
ALTER TABLE customers
ALTER COLUMN company_id TYPE TEXT;
END IF;
END $$;
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'normalized_reps'
) THEN
ALTER TABLE normalized_reps
ALTER COLUMN company_id TYPE TEXT;
END IF;
END $$;
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'route_visits'
) THEN
ALTER TABLE route_visits
ALTER COLUMN company_id TYPE TEXT;
END IF;
END $$;
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'route_versions'
) THEN
ALTER TABLE route_versions
ALTER COLUMN company_id TYPE TEXT;
END IF;
IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'route_meta'
) THEN
ALTER TABLE route_meta
ALTER COLUMN company_id TYPE TEXT;
END IF;
END $$;
-- 7. Re-establish Foreign Keys
DO $$ BEGIN
ALTER TABLE branches
ADD CONSTRAINT branches_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'normalized_routes'
) THEN
ALTER TABLE normalized_routes
ADD CONSTRAINT normalized_routes_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
END IF;
IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'routes'
) THEN
ALTER TABLE routes
ADD CONSTRAINT routes_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
END IF;
IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'normalized_customers'
) THEN
ALTER TABLE normalized_customers
ADD CONSTRAINT normalized_customers_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
END IF;
IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'normalized_reps'
) THEN
ALTER TABLE normalized_reps
ADD CONSTRAINT normalized_reps_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
END IF;
IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'route_visits'
) THEN
ALTER TABLE route_visits
ADD CONSTRAINT route_visits_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
END IF;
IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'route_versions'
) THEN
ALTER TABLE route_versions
ADD CONSTRAINT route_versions_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
END IF;
END $$;
-- 8. RESTORE POLICIES
CREATE POLICY "Update Own Company" ON companies FOR
UPDATE USING (id = public.get_current_company_id()) WITH CHECK (id = public.get_current_company_id());
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'customers'
) THEN CREATE POLICY "Hybrid Isolation Customers" ON customers FOR ALL USING (
    is_sys_admin()
    OR company_id = public.get_current_company_id()
) WITH CHECK (company_id = public.get_current_company_id());
END IF;
END $$;
CREATE POLICY "Restricted Write Users" ON app_users FOR ALL USING (
    is_sys_admin()
    OR company_id = public.get_current_company_id()
) WITH CHECK (
    company_id = public.get_current_company_id()
);
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'route_meta'
) THEN CREATE POLICY "Hybrid Isolation Routes" ON route_meta FOR ALL USING (
    is_sys_admin()
    OR company_id = public.get_current_company_id()
) WITH CHECK (company_id = public.get_current_company_id());
END IF;
END $$;
-- Normalized Tables Policies
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'branches'
) THEN CREATE POLICY "branches_company_policy" ON branches FOR ALL USING (
    company_id = current_setting('app.company_id', true)::TEXT
    OR current_setting('app.is_sysadmin', true)::BOOLEAN = true
);
END IF;
IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'routes'
) THEN CREATE POLICY "routes_company_policy" ON routes FOR ALL USING (
    company_id = current_setting('app.company_id', true)::TEXT
    OR current_setting('app.is_sysadmin', true)::BOOLEAN = true
);
END IF;
IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'normalized_customers'
) THEN CREATE POLICY "normalized_customers_company_policy" ON normalized_customers FOR ALL USING (
    company_id = current_setting('app.company_id', true)::TEXT
    OR current_setting('app.is_sysadmin', true)::BOOLEAN = true
);
END IF;
IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'route_visits'
) THEN CREATE POLICY "route_visits_company_policy" ON route_visits FOR ALL USING (
    company_id = current_setting('app.company_id', true)::TEXT
    OR current_setting('app.is_sysadmin', true)::BOOLEAN = true
);
END IF;
END $$;
-- 9. RESTORE VIEWS (Re-create with new column types)
-- v_route_schedule
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
    JOIN branches b ON r.branch_id = b.id;
-- v_customer_summary
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
    JOIN branches b ON c.branch_id = b.id
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
-- v_route_summary
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
    JOIN branches b ON r.branch_id = b.id
    LEFT JOIN route_visits rv ON rv.route_id = r.id
GROUP BY r.id,
    r.name,
    r.rep_code,
    b.name_en,
    r.company_id;
-- view_branch_stats
CREATE OR REPLACE VIEW view_branch_stats AS
SELECT b.id AS branch_id,
    b.name_en AS branch_name,
    b.company_id,
    (
        SELECT COUNT(*)
        FROM normalized_customers c
        WHERE c.branch_id = b.id
    ) AS total_customers,
    (
        SELECT COUNT(*)
        FROM routes r
        WHERE r.branch_id = b.id
            AND r.is_active = true
    ) AS active_routes,
    COUNT(rv.id) AS scheduled_visits,
    COUNT(
        CASE
            WHEN rv.is_visited = true THEN 1
        END
    ) AS visited_count,
    CASE
        WHEN COUNT(rv.id) = 0 THEN 0
        ELSE ROUND(
            (
                COUNT(
                    CASE
                        WHEN rv.is_visited = true THEN 1
                    END
                )::NUMERIC / COUNT(rv.id)::NUMERIC
            ) * 100,
            1
        )
    END AS completion_rate
FROM branches b
    LEFT JOIN routes r ON r.branch_id = b.id
    LEFT JOIN route_visits rv ON rv.route_id = r.id
GROUP BY b.id,
    b.name_en,
    b.company_id;
-- view_route_performance
CREATE OR REPLACE VIEW view_route_performance AS
SELECT r.id AS route_id,
    r.name AS route_name,
    r.rep_code,
    r.branch_id,
    r.company_id,
    COUNT(rv.id) AS total_stops,
    COUNT(
        CASE
            WHEN rv.is_visited = true THEN 1
        END
    ) AS visited_stops,
    (
        COUNT(rv.id) - COUNT(
            CASE
                WHEN rv.is_visited = true THEN 1
            END
        )
    ) AS pending_stops,
    CASE
        WHEN COUNT(rv.id) = 0 THEN 0
        ELSE ROUND(
            (
                COUNT(
                    CASE
                        WHEN rv.is_visited = true THEN 1
                    END
                )::NUMERIC / COUNT(rv.id)::NUMERIC
            ) * 100,
            1
        )
    END AS efficiency_score
FROM routes r
    LEFT JOIN route_visits rv ON rv.route_id = r.id
WHERE r.is_active = true
GROUP BY r.id,
    r.name,
    r.rep_code,
    r.branch_id,
    r.company_id;
-- 10. Grant permissions to authenticated users for restored views (Just in case)
GRANT SELECT ON view_branch_stats TO authenticated;
GRANT SELECT ON view_route_performance TO authenticated;
-- (Assuming standard public access is fine for others or handled by RLS)
COMMIT;
-- Verification
SELECT table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE column_name = 'company_id'
    AND table_name IN (
        'companies',
        'branches',
        'routes',
        'view_branch_stats'
    );