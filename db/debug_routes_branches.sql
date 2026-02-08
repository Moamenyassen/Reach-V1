-- =====================================================
-- DIAGNOSTIC: Check routes and branches tables
-- =====================================================
-- Check if routes table has data for this company
SELECT 'routes' as tbl,
    COUNT(*) as cnt
FROM routes
WHERE company_id = '31fcb45a-c138-4deb-8755-e9378e95325f';
-- Check if company_branches table has data
SELECT 'company_branches' as tbl,
    COUNT(*) as cnt
FROM company_branches
WHERE company_id = '31fcb45a-c138-4deb-8755-e9378e95325f';
-- Check RLS on routes and company_branches
SELECT tablename,
    CASE
        WHEN relrowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END AS rls_status
FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
WHERE tablename IN ('routes', 'company_branches');
-- Check sample join query (simplified)
SELECT COUNT(*) as joinable_visits
FROM route_visits rv
    JOIN routes r ON rv.route_id = r.id
    JOIN company_branches cb ON r.branch_id = cb.id
WHERE rv.company_id = '31fcb45a-c138-4deb-8755-e9378e95325f';