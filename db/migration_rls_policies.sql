-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- Purpose: Restrict access to data based on user's assigned branches and routes.
-- Admins/Managers see all data for their company.
-- Reps/Users see only data for their assigned branches/routes.
-- ------------------------------------------
-- 1. HELPER FUNCTIONS
-- ------------------------------------------
-- IMPORTANT: These functions are SECURITY DEFINER.
-- They run with the privileges of the creator (postgres/admin), BYPASSING RLS.
-- This is CRITICAL to avoid infinite recursion when RLS policies need to check user roles/assignments.
-- We must ensure they only return data for the AUTHENTICATED user (auth.uid()).
-- Function to get current user's assigned branch IDs
CREATE OR REPLACE FUNCTION get_user_branch_ids() RETURNS text [] AS $$
DECLARE _branch_ids text [];
BEGIN
SELECT branch_ids INTO _branch_ids
FROM app_users
WHERE id = auth.uid()
    OR email = (
        select email
        from auth.users
        where id = auth.uid()
    )
LIMIT 1;
RETURN COALESCE(_branch_ids, '{}'::text []);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to get current user's assigned route IDs
CREATE OR REPLACE FUNCTION get_user_route_ids() RETURNS text [] AS $$
DECLARE _route_ids text [];
BEGIN
SELECT route_ids INTO _route_ids
FROM app_users
WHERE id = auth.uid()
    OR email = (
        select email
        from auth.users
        where id = auth.uid()
    )
LIMIT 1;
RETURN COALESCE(_route_ids, '{}'::text []);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to get current user's company ID (Bypassing RLS)
CREATE OR REPLACE FUNCTION get_user_company_id() RETURNS text AS $$
DECLARE _company_id text;
BEGIN
SELECT company_id INTO _company_id
FROM app_users
WHERE id = auth.uid()
    OR email = (
        select email
        from auth.users
        where id = auth.uid()
    )
LIMIT 1;
RETURN _company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to check if user is Admin or Manager
CREATE OR REPLACE FUNCTION is_admin_or_manager() RETURNS boolean AS $$
DECLARE _role text;
BEGIN -- Check app_users role
SELECT role INTO _role
FROM app_users
WHERE id = auth.uid()
    OR email = (
        select email
        from auth.users
        where id = auth.uid()
    )
LIMIT 1;
RETURN _role IN ('ADMIN', 'MANAGER', 'SYSADMIN');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ------------------------------------------
-- 2. ENABLE RLS
-- ------------------------------------------
ALTER TABLE company_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE normalized_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
-- ------------------------------------------
-- 3. POLICIES
-- ------------------------------------------
-- A) COMPANY BRANCHES
-- Policy: View if Admin/Manager OR Branch CODE is in user's assigned branches
DROP POLICY IF EXISTS "Branches: Access Policy" ON company_branches;
CREATE POLICY "Branches: Access Policy" ON company_branches FOR
SELECT USING (
        company_id::text = (
            select company_id::text
            from app_users
            where id = auth.uid()
                OR email = (
                    select email
                    from auth.users
                    where id = auth.uid()
                )
            limit 1
        )
        AND (
            is_admin_or_manager()
            OR name_en = ANY(get_user_branch_ids()) -- usage of 'name_en' match (Fixed from code)
        )
    );
-- B) ROUTES
-- Policy: View if Admin/Manager OR Route NAME in user's routes OR Route's Branch NAME in user's branches
DROP POLICY IF EXISTS "Routes: Access Policy" ON routes;
CREATE POLICY "Routes: Access Policy" ON routes FOR
SELECT USING (
        company_id::text = (
            select company_id::text
            from app_users
            where id = auth.uid()
                OR email = (
                    select email
                    from auth.users
                    where id = auth.uid()
                )
            limit 1
        )
        AND (
            is_admin_or_manager()
            OR name = ANY(get_user_route_ids()) -- Match by Route Name
            OR branch_id IN (
                SELECT id
                FROM company_branches
                WHERE name_en = ANY(get_user_branch_ids()) -- FIXED: Match Name
            )
        )
    );
-- C) CUSTOMERS (NORMALIZED)
-- Policy: Admin/Manager OR Branch in user's branches OR Customer is on a route user is assigned to
DROP POLICY IF EXISTS "Customers: Access Policy" ON normalized_customers;
CREATE POLICY "Customers: Access Policy" ON normalized_customers FOR
SELECT USING (
        company_id::text = (
            select company_id::text
            from app_users
            where id = auth.uid()
                OR email = (
                    select email
                    from auth.users
                    where id = auth.uid()
                )
            limit 1
        )
        AND (
            is_admin_or_manager()
            OR branch_id IN (
                SELECT id
                FROM company_branches
                WHERE name_en = ANY(get_user_branch_ids()) -- FIXED: Match Name
            )
            OR EXISTS (
                SELECT 1
                FROM route_visits rv
                    JOIN routes r ON rv.route_id = r.id
                WHERE rv.customer_id = normalized_customers.id
                    AND r.name = ANY(get_user_route_ids()) -- Match visit by route name
            )
        )
    );
-- D) VISITS
-- Policy: Admin/Manager OR Route in user's routes
DROP POLICY IF EXISTS "Visits: Access Policy" ON route_visits;
CREATE POLICY "Visits: Access Policy" ON route_visits FOR
SELECT USING (
        company_id::text = (
            select company_id::text
            from app_users
            where id = auth.uid()
                OR email = (
                    select email
                    from auth.users
                    where id = auth.uid()
                )
            limit 1
        )
        AND (
            is_admin_or_manager()
            OR EXISTS (
                SELECT 1
                FROM routes r
                WHERE r.id = route_visits.route_id
                    AND r.name = ANY(get_user_route_ids())
            )
        )
    );
-- ------------------------------------------
-- 4. APP USERS (Self Access)
-- ------------------------------------------
-- Use a simpler policy to avoid recursion.
-- We rely on basic ID check first.
DROP POLICY IF EXISTS "Users: Read Own Profile" ON app_users;
CREATE POLICY "Users: Read Own Profile" ON app_users FOR
SELECT USING (
        id = auth.uid()
        OR email = (
            select email
            from auth.users
            where id = auth.uid()
        )
        OR -- For Admins to see others, we strictly check their own role without re-triggering this policy inappropriately if possible.
        -- However, since `is_admin_or_manager()` is now SECURITY DEFINER, it bypasses RLS, so we CAN use it here safely!
        (
            is_admin_or_manager()
            AND company_id = get_user_company_id() -- Use helper to avoid recursion
        )
    );
-- ------------------------------------------
-- 5. SECURE VIEWS (Fix for Route Sequence & Insights)
-- ------------------------------------------
-- Re-create views with security_invoker = true to enforce RLS
DROP VIEW IF EXISTS v_route_schedule;
CREATE OR REPLACE VIEW v_route_schedule WITH (security_invoker = true) AS
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
DROP VIEW IF EXISTS v_customer_summary;
CREATE OR REPLACE VIEW v_customer_summary WITH (security_invoker = true) AS
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
DROP VIEW IF EXISTS v_route_summary;
CREATE OR REPLACE VIEW v_route_summary WITH (security_invoker = true) AS
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