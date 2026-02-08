-- =====================================================
-- CHECK: Verify data in normalized tables
-- =====================================================
-- Check if normalized_customers has data for the company
SELECT COUNT(*) as normalized_count
FROM normalized_customers
WHERE company_id = '31fcb45a-c138-4deb-8755-e9378e95325f';
-- Check if route_visits has data
SELECT COUNT(*) as visits_count
FROM route_visits
WHERE company_id = '31fcb45a-c138-4deb-8755-e9378e95325f';
-- Check RLS status on these tables
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
        'company_uploaded_data'
    );