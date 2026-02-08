-- =====================================================
-- ENABLE BRANCH-BASED RLS
-- =====================================================
-- This script re-enables RLS on core tables.
-- The policies already exist from migration_rls_policies.sql.
-- =====================================================
-- Step 1: Enable RLS on all core tables
ALTER TABLE normalized_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_branches ENABLE ROW LEVEL SECURITY;
-- Step 2: Refresh schema cache
NOTIFY pgrst,
'reload schema';
-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Check RLS status
SELECT tablename,
    CASE
        WHEN relrowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END AS rls_status
FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
WHERE tablename IN (
        'normalized_customers',
        'route_visits',
        'routes',
        'company_branches'
    );
-- Check existing policies
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