-- =====================================================
-- DIAGNOSTIC: Temporarily disable RLS to test
-- =====================================================
-- Run this to check if RLS is the issue.
-- If Insights works after this, the problem is RLS.
-- If it still doesn't work, the problem is elsewhere.
-- =====================================================
-- Step 1: Disable RLS temporarily
ALTER TABLE company_uploaded_data DISABLE ROW LEVEL SECURITY;
-- Step 2: Refresh schema cache
NOTIFY pgrst,
'reload schema';
-- =====================================================
-- After testing, RE-ENABLE RLS with:
-- ALTER TABLE company_uploaded_data ENABLE ROW LEVEL SECURITY;
-- NOTIFY pgrst, 'reload schema';
-- =====================================================