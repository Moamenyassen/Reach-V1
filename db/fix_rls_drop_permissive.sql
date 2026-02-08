-- =====================================================
-- FIX: Remove permissive public_access policies
-- =====================================================
-- These policies are overriding the branch restrictions.
-- PostgreSQL uses OR logic: if ANY policy allows access, row is visible.
-- =====================================================
-- Drop the permissive policies on company_branches
DROP POLICY IF EXISTS "company_branches_public_access" ON company_branches;
DROP POLICY IF EXISTS "company_branches_company_policy" ON company_branches;
-- Drop the permissive policies on normalized_customers
DROP POLICY IF EXISTS "normalized_customers_public_access" ON normalized_customers;
DROP POLICY IF EXISTS "normalized_customers_company_policy" ON normalized_customers;
-- Drop the permissive policies on route_visits
DROP POLICY IF EXISTS "route_visits_public_access" ON route_visits;
DROP POLICY IF EXISTS "route_visits_company_policy" ON route_visits;
-- Drop the permissive policies on routes (if they exist)
DROP POLICY IF EXISTS "routes_public_access" ON routes;
DROP POLICY IF EXISTS "routes_company_policy" ON routes;
-- Refresh schema cache
NOTIFY pgrst,
'reload schema';
-- =====================================================
-- VERIFY: Only the Access Policy should remain
-- =====================================================
SELECT schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE tablename IN (
        'normalized_customers',
        'route_visits',
        'routes',
        'company_branches'
    )
ORDER BY tablename;