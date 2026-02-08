-- =====================================================
-- DIAGNOSTIC: Check what data exists in company_uploaded_data
-- =====================================================
-- Run these queries to understand what's in the table
-- 1. Check if table has ANY data at all
SELECT COUNT(*) as total_rows
FROM company_uploaded_data;
-- 2. Check what company_ids exist in the table
SELECT DISTINCT company_id,
    COUNT(*) as row_count
FROM company_uploaded_data
GROUP BY company_id
ORDER BY row_count DESC
LIMIT 10;
-- 3. Check sample of data
SELECT company_id,
    branch_name,
    route_name,
    client_code
FROM company_uploaded_data
LIMIT 5;
-- 4. Check what company_id format the current user has
SELECT id,
    email,
    company_id
FROM app_users
LIMIT 5;
-- 5. Test RPC with a known company_id from step 2
-- SELECT get_dashboard_stats_from_upload('PASTE_COMPANY_ID_FROM_STEP_2');