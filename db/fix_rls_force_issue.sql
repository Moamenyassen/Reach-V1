-- =====================================================
-- FIX: Remove FORCE RLS to allow SECURITY DEFINER to work
-- =====================================================
-- The issue: FORCE ROW LEVEL SECURITY applies RLS even to 
-- SECURITY DEFINER functions, which breaks our RPCs.
-- 
-- Solution: Keep RLS enabled but remove FORCE. This means:
-- - Normal authenticated users: RLS applies
-- - SECURITY DEFINER functions: Can bypass RLS (intended)
-- - Service role: Can bypass RLS (intended for admin operations)
-- =====================================================
-- Remove FORCE (allows SECURITY DEFINER to bypass RLS)
ALTER TABLE company_uploaded_data NO FORCE ROW LEVEL SECURITY;
-- Ensure RLS is still enabled
ALTER TABLE company_uploaded_data ENABLE ROW LEVEL SECURITY;
-- Refresh schema cache
NOTIFY pgrst,
'reload schema';
-- =====================================================
-- VERIFICATION: Run this to confirm settings
-- =====================================================
-- SELECT relname, relrowsecurity, relforcerowsecurity 
-- FROM pg_class WHERE relname = 'company_uploaded_data';
-- Expected: relrowsecurity = true, relforcerowsecurity = false
-- =====================================================