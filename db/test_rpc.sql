-- =====================================================
-- TEST: Direct RPC call for Insights
-- =====================================================
-- Run this to test if the RPC function works
-- Test 1: Call the RPC with the known company_id
SELECT get_dashboard_stats_from_upload('31fcb45a-c138-4deb-8755-e9378e95325f');
-- If this returns NULL or error, the RPC function needs to be redeployed.
-- Run the contents of db/migration_insights_rpc.sql to fix it.