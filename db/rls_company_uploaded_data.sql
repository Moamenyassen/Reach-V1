-- =====================================================
-- RLS Policies for company_uploaded_data
-- =====================================================
-- This migration enables Row Level Security on the company_uploaded_data table
-- which was previously disabled for debugging purposes.
--
-- The policies enforce:
-- 1. Company isolation - users can only see their own company's data
-- 2. Branch filtering - non-admin users only see data from their assigned branches
-- =====================================================
-- Step 1: Enable RLS on the table
ALTER TABLE company_uploaded_data ENABLE ROW LEVEL SECURITY;
-- NOTE: We intentionally do NOT use FORCE ROW LEVEL SECURITY
-- because that would also apply RLS to SECURITY DEFINER functions,
-- breaking our RPCs (get_dashboard_stats_from_upload, etc.)
-- Step 2: Drop any existing policies to start fresh
-- Step 3: Drop any existing policies to start fresh
DROP POLICY IF EXISTS "company_uploaded_data_select" ON company_uploaded_data;
DROP POLICY IF EXISTS "company_uploaded_data_insert" ON company_uploaded_data;
DROP POLICY IF EXISTS "company_uploaded_data_update" ON company_uploaded_data;
DROP POLICY IF EXISTS "company_uploaded_data_delete" ON company_uploaded_data;
-- Step 4: Create SELECT policy
-- Users can only see data from their company AND their assigned branches (or all if admin)
CREATE POLICY "company_uploaded_data_select" ON company_uploaded_data FOR
SELECT USING (
        -- Company isolation: must match user's company
        company_id::text = get_user_company_id()::text
        AND (
            -- Admins/Managers see all company data
            is_admin_or_manager()
            OR -- Branch-restricted users only see their assigned branches
            branch_name = ANY(get_user_branch_ids())
        )
    );
-- Step 5: Create INSERT policy
-- Users can only insert data for their own company
CREATE POLICY "company_uploaded_data_insert" ON company_uploaded_data FOR
INSERT WITH CHECK (
        company_id::text = get_user_company_id()::text
    );
-- Step 6: Create UPDATE policy
-- Users can only update data from their company AND their assigned branches
CREATE POLICY "company_uploaded_data_update" ON company_uploaded_data FOR
UPDATE USING (
        company_id::text = get_user_company_id()::text
        AND (
            is_admin_or_manager()
            OR branch_name = ANY(get_user_branch_ids())
        )
    ) WITH CHECK (
        company_id::text = get_user_company_id()::text
    );
-- Step 7: Create DELETE policy
-- Only admins/managers can delete data from their company
CREATE POLICY "company_uploaded_data_delete" ON company_uploaded_data FOR DELETE USING (
    company_id::text = get_user_company_id()::text
    AND is_admin_or_manager()
);
-- Step 8: Grant necessary permissions (RLS still applies)
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON company_uploaded_data TO authenticated;
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON company_uploaded_data TO service_role;
-- Step 9: Refresh schema cache
NOTIFY pgrst,
'reload schema';
-- =====================================================
-- VERIFICATION QUERIES (Run manually to test)
-- =====================================================
-- 
-- Test 1: Check if RLS is enabled
-- SELECT relname, relrowsecurity, relforcerowsecurity 
-- FROM pg_class WHERE relname = 'company_uploaded_data';
-- 
-- Test 2: List all policies on the table
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies WHERE tablename = 'company_uploaded_data';
-- 
-- =====================================================