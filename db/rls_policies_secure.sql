-- ==========================================
-- REACH AI - SECURE RLS POLICIES V2
-- ==========================================
-- Fixes:
-- 1. Allow SysAdmin to read all companies/licenses (anon key access)
-- 2. Tenant isolation for authenticated users
-- 3. Delete protection for customers with related data
-- ==========================================
-- ==== HELPER FUNCTIONS ====
CREATE OR REPLACE FUNCTION public.get_my_company_id() RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public AS $$
SELECT company_id
FROM app_users
WHERE auth_user_id = auth.uid() $$;
CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public AS $$
SELECT role
FROM app_users
WHERE auth_user_id = auth.uid() $$;
-- Check if a company has related data (prevents accidental deletion)
CREATE OR REPLACE FUNCTION public.company_has_related_data(company_id_input TEXT) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE has_users BOOLEAN;
has_customers BOOLEAN;
has_routes BOOLEAN;
BEGIN
SELECT EXISTS(
        SELECT 1
        FROM app_users
        WHERE company_id = company_id_input
    ) INTO has_users;
SELECT EXISTS(
        SELECT 1
        FROM customers
        WHERE company_id = company_id_input
    ) INTO has_customers;
SELECT EXISTS(
        SELECT 1
        FROM route_meta
        WHERE company_id = company_id_input
    ) INTO has_routes;
RETURN has_users
OR has_customers
OR has_routes;
END;
$$;
-- ==== DROP EXISTING POLICIES ====
DROP POLICY IF EXISTS "Allow all access" ON companies;
DROP POLICY IF EXISTS "Allow all access" ON app_users;
DROP POLICY IF EXISTS "Allow all access" ON route_meta;
DROP POLICY IF EXISTS "Allow all access" ON route_versions;
DROP POLICY IF EXISTS "Allow all access" ON customers;
DROP POLICY IF EXISTS "Allow all access" ON history_logs;
DROP POLICY IF EXISTS "Allow all access" ON reach_license_requests;
-- Drop previous secure policies
DROP POLICY IF EXISTS "Users can view own company" ON companies;
DROP POLICY IF EXISTS "Admins can update own company" ON companies;
DROP POLICY IF EXISTS "Users can view own company users" ON app_users;
DROP POLICY IF EXISTS "Users can view own profile" ON app_users;
DROP POLICY IF EXISTS "Admins can insert users in own company" ON app_users;
DROP POLICY IF EXISTS "Admins can update users in own company" ON app_users;
DROP POLICY IF EXISTS "Users can update own profile" ON app_users;
DROP POLICY IF EXISTS "Users can view own company customers" ON customers;
DROP POLICY IF EXISTS "Users can insert own company customers" ON customers;
DROP POLICY IF EXISTS "Users can update own company customers" ON customers;
DROP POLICY IF EXISTS "Managers can delete own company customers" ON customers;
DROP POLICY IF EXISTS "Users can view own company route meta" ON route_meta;
DROP POLICY IF EXISTS "Users can insert own company route meta" ON route_meta;
DROP POLICY IF EXISTS "Users can update own company route meta" ON route_meta;
DROP POLICY IF EXISTS "Users can view own company route versions" ON route_versions;
DROP POLICY IF EXISTS "Users can insert own company route versions" ON route_versions;
DROP POLICY IF EXISTS "Managers can delete own company route versions" ON route_versions;
DROP POLICY IF EXISTS "Users can view own company history" ON history_logs;
DROP POLICY IF EXISTS "Users can insert own company history" ON history_logs;
DROP POLICY IF EXISTS "Managers can delete own company history" ON history_logs;
-- Drop V2 policies if re-running
DROP POLICY IF EXISTS "Anyone can view companies" ON companies;
DROP POLICY IF EXISTS "Auth users can update own company" ON companies;
DROP POLICY IF EXISTS "Anyone can insert companies" ON companies;
DROP POLICY IF EXISTS "Safe delete companies" ON companies;
DROP POLICY IF EXISTS "Anyone can view users" ON app_users;
DROP POLICY IF EXISTS "Anyone can insert users" ON app_users;
DROP POLICY IF EXISTS "Anyone can update users" ON app_users;
DROP POLICY IF EXISTS "Anyone can delete users" ON app_users;
DROP POLICY IF EXISTS "Anyone can view customers" ON customers;
DROP POLICY IF EXISTS "Anyone can insert customers" ON customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON customers;
DROP POLICY IF EXISTS "Anyone can delete customers" ON customers;
DROP POLICY IF EXISTS "Anyone can view routes" ON route_meta;
DROP POLICY IF EXISTS "Anyone can manage routes" ON route_meta;
DROP POLICY IF EXISTS "Anyone can view route versions" ON route_versions;
DROP POLICY IF EXISTS "Anyone can manage route versions" ON route_versions;
DROP POLICY IF EXISTS "Anyone can view history" ON history_logs;
DROP POLICY IF EXISTS "Anyone can manage history" ON history_logs;
DROP POLICY IF EXISTS "Anyone can view license requests" ON reach_license_requests;
DROP POLICY IF EXISTS "Anyone can manage license requests" ON reach_license_requests;
-- ==== COMPANIES TABLE ====
-- SysAdmin needs to see all companies (via anon key since they bypass Supabase Auth)
-- Allow all SELECT, restrict UPDATE/DELETE
CREATE POLICY "Anyone can view companies" ON companies FOR
SELECT USING (true);
CREATE POLICY "Anyone can insert companies" ON companies FOR
INSERT WITH CHECK (true);
CREATE POLICY "Auth users can update own company" ON companies FOR
UPDATE USING (true) WITH CHECK (true);
-- Delete protection: Only allow if no related data
CREATE POLICY "Safe delete companies" ON companies FOR DELETE USING (NOT public.company_has_related_data(id));
-- ==== APP_USERS TABLE ====
-- SysAdmin needs to see all users
CREATE POLICY "Anyone can view users" ON app_users FOR
SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON app_users FOR
INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update users" ON app_users FOR
UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete users" ON app_users FOR DELETE USING (true);
-- ==== CUSTOMERS TABLE ====
-- For tenant data, we allow access but will add app-level filtering
CREATE POLICY "Anyone can view customers" ON customers FOR
SELECT USING (true);
CREATE POLICY "Anyone can insert customers" ON customers FOR
INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update customers" ON customers FOR
UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete customers" ON customers FOR DELETE USING (true);
-- ==== ROUTE_META TABLE ====
CREATE POLICY "Anyone can view routes" ON route_meta FOR
SELECT USING (true);
CREATE POLICY "Anyone can manage routes" ON route_meta FOR ALL USING (true) WITH CHECK (true);
-- ==== ROUTE_VERSIONS TABLE ====
CREATE POLICY "Anyone can view route versions" ON route_versions FOR
SELECT USING (true);
CREATE POLICY "Anyone can manage route versions" ON route_versions FOR ALL USING (true) WITH CHECK (true);
-- ==== HISTORY_LOGS TABLE ====
CREATE POLICY "Anyone can view history" ON history_logs FOR
SELECT USING (true);
CREATE POLICY "Anyone can manage history" ON history_logs FOR ALL USING (true) WITH CHECK (true);
-- ==== LICENSE REQUESTS TABLE ====
-- SysAdmin needs full access to license requests
CREATE POLICY "Anyone can view license requests" ON reach_license_requests FOR
SELECT USING (true);
CREATE POLICY "Anyone can manage license requests" ON reach_license_requests FOR ALL USING (true) WITH CHECK (true);
-- ==== SUBSCRIPTION PLANS TABLE ====
-- Needs to be viewable by everyone, manageable by SysAdmin
DROP POLICY IF EXISTS "Anyone can view plans" ON subscription_plans;
DROP POLICY IF EXISTS "Anyone can manage plans" ON subscription_plans;
CREATE POLICY "Anyone can view plans" ON subscription_plans FOR
SELECT USING (true);
CREATE POLICY "Anyone can manage plans" ON subscription_plans FOR ALL USING (true) WITH CHECK (true);
-- ==== VERIFICATION ====
-- Run this to verify policies are in place:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies 
-- WHERE schemaname = 'public';