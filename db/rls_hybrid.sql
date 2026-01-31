-- ==========================================
-- REACH AI - HYBRID RLS POLICIES (LEGACY + AUTH SUPPORT)
-- ==========================================
-- This script secures the database while supporting "Legacy Users" (created via Admin Panel)
-- who rely on client-side authentication headers.
-- ==== HELPER FUNCTIONS ====
-- Get Company ID from Auth (Real Users) OR Header (Legacy Users)
CREATE OR REPLACE FUNCTION public.get_current_company_id() RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE auth_company_id TEXT;
header_company_id TEXT;
BEGIN -- 1. Try Supabase Auth
SELECT company_id INTO auth_company_id
FROM app_users
WHERE auth_user_id = auth.uid();
IF auth_company_id IS NOT NULL THEN RETURN auth_company_id;
END IF;
-- 2. Try Legacy Header (x-company-id)
-- Requires client to send 'x-company-id' in global headers
BEGIN header_company_id := current_setting('request.headers', true)::json->>'x-company-id';
EXCEPTION
WHEN OTHERS THEN header_company_id := NULL;
END;
RETURN header_company_id;
END;
$$;
-- Check if user is System Admin
CREATE OR REPLACE FUNCTION public.is_sys_admin() RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE u_role TEXT;
BEGIN -- Check Auth User Role
SELECT role INTO u_role
FROM app_users
WHERE auth_user_id = auth.uid();
IF u_role = 'SYS_ADMIN' THEN RETURN TRUE;
END IF;
-- Check Legacy User (Implicit trust for SysAdmin Dashboard if needed, usually SysAdmin SHOULD be Auth)
-- For safety, SysAdmin operations should ideally require Real Auth.
RETURN FALSE;
END;
$$;
-- ==== ENABLE RLS ON ALL SENSITIVE TABLES ====
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_logs ENABLE ROW LEVEL SECURITY;
-- ==== CUSTOMERS POLICY (STRICT ISOLATION) ====
DROP POLICY IF EXISTS "Hybrid Isolation Customers" ON customers;
DROP POLICY IF EXISTS "Anyone can view customers" ON customers;
-- Drop old open policy
CREATE POLICY "Hybrid Isolation Customers" ON customers FOR ALL -- Select, Insert, Update, Delete
USING (
    -- SysAdmin Access
    is_sys_admin()
    OR -- Tenant Match
    company_id = public.get_current_company_id()
) WITH CHECK (
    company_id = public.get_current_company_id()
);
-- ==== ROUTES POLICY ====
DROP POLICY IF EXISTS "Hybrid Isolation Routes" ON route_meta;
DROP POLICY IF EXISTS "Anyone can view routes" ON route_meta;
CREATE POLICY "Hybrid Isolation Routes" ON route_meta FOR ALL USING (
    is_sys_admin()
    OR company_id = public.get_current_company_id()
) WITH CHECK (
    company_id = public.get_current_company_id()
);
-- ==== APP_USERS POLICY (SPECIAL CASE) ====
-- We MUST allow Public Read for "Legacy Login" flow to find users by username.
-- However, we can restrict Write/Delete.
DROP POLICY IF EXISTS "Public Read Users" ON app_users;
DROP POLICY IF EXISTS "Restricted Write Users" ON app_users;
DROP POLICY IF EXISTS "Anyone can view users" ON app_users;
-- READ: Open to everyone (Required for Login Check)
CREATE POLICY "Public Read Users" ON app_users FOR
SELECT USING (true);
-- WRITE (Insert/Update/Delete): Restricted to Tenant or Admin
CREATE POLICY "Restricted Write Users" ON app_users FOR ALL USING (
    is_sys_admin()
    OR company_id = public.get_current_company_id()
) WITH CHECK (
    company_id = public.get_current_company_id()
);
-- ==== COMPANIES TABLE ====
-- Read: Open (for Login check often needed or setup) logic, or restrict to tenant.
-- Current logic implies we need basic read access.
DROP POLICY IF EXISTS "Read Companies" ON companies;
CREATE POLICY "Read Companies" ON companies FOR
SELECT USING (true);
-- Update: Only Admin or Tenant Owner
CREATE POLICY "Update Own Company" ON companies FOR
UPDATE USING (id = public.get_current_company_id()) WITH CHECK (id = public.get_current_company_id());