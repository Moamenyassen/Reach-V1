-- =====================================================
-- ROLLBACK: Restore original state (RLS disabled)
-- =====================================================
-- The RLS policies blocked all access because the anon key
-- (used by frontend and Node.js server) doesn't have user context.
-- get_user_company_id() returns NULL for anon requests.
--
-- FOR NOW: Disable RLS to restore functionality.
-- FUTURE: Implement proper service_role key for server-side queries.
-- =====================================================
-- Disable RLS
ALTER TABLE company_uploaded_data DISABLE ROW LEVEL SECURITY;
-- Drop the policies we created
DROP POLICY IF EXISTS "company_uploaded_data_select" ON company_uploaded_data;
DROP POLICY IF EXISTS "company_uploaded_data_insert" ON company_uploaded_data;
DROP POLICY IF EXISTS "company_uploaded_data_update" ON company_uploaded_data;
DROP POLICY IF EXISTS "company_uploaded_data_delete" ON company_uploaded_data;
-- Refresh schema
NOTIFY pgrst,
'reload schema';
-- =====================================================
-- DONE: This restores the table to its original working state.
-- RLS enforcement on this table requires using service_role key
-- for server-side queries, which is a bigger change.
-- =====================================================