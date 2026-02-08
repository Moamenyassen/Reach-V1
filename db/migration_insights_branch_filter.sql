-- =====================================================
-- Migration: Add branch filtering + Fix missing KPI calculations
-- Run this in Supabase SQL Editor
-- =====================================================
-- Drop existing versions to avoid "function is not unique" error
DROP FUNCTION IF EXISTS get_dashboard_stats_from_upload(TEXT);
DROP FUNCTION IF EXISTS get_dashboard_stats_from_upload(TEXT, TEXT []);
-- Recreate with branch filtering support + proper KPI calculations
CREATE OR REPLACE FUNCTION get_dashboard_stats_from_upload(
        p_company_id TEXT,
        p_branch_ids TEXT [] DEFAULT NULL -- Array of branch codes/names to filter
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_total_customers INT;
v_active_routes INT;
v_total_visits INT;
v_total_users INT;
v_total_distance NUMERIC;
v_total_time NUMERIC;
v_avg_visits NUMERIC;
v_time_per_user NUMERIC;
v_frequency NUMERIC;
v_efficiency NUMERIC;
v_route_health JSONB;
v_alerts JSONB;
v_result JSONB;
BEGIN -- Total Visits (Rows) - filtered by branches if provided
SELECT COUNT(*) INTO v_total_visits
FROM company_uploaded_data
WHERE company_id = p_company_id
    AND (
        p_branch_ids IS NULL
        OR array_length(p_branch_ids, 1) IS NULL
        OR branch_code = ANY(p_branch_ids)
        OR branch_name = ANY(p_branch_ids)
    );
-- Total Customers (Distinct Client Code) - filtered by branches
SELECT COUNT(DISTINCT client_code) INTO v_total_customers
FROM company_uploaded_data
WHERE company_id = p_company_id
    AND (
        p_branch_ids IS NULL
        OR array_length(p_branch_ids, 1) IS NULL
        OR branch_code = ANY(p_branch_ids)
        OR branch_name = ANY(p_branch_ids)
    );
-- Active Routes (Distinct Route Name) - filtered by branches
SELECT COUNT(DISTINCT route_name) INTO v_active_routes
FROM company_uploaded_data
WHERE company_id = p_company_id
    AND (
        p_branch_ids IS NULL
        OR array_length(p_branch_ids, 1) IS NULL
        OR branch_code = ANY(p_branch_ids)
        OR branch_name = ANY(p_branch_ids)
    );
-- Total Users (Distinct rep_code) - for Time/User calculation
SELECT COUNT(DISTINCT rep_code) INTO v_total_users
FROM company_uploaded_data
WHERE company_id = p_company_id
    AND rep_code IS NOT NULL
    AND (
        p_branch_ids IS NULL
        OR array_length(p_branch_ids, 1) IS NULL
        OR branch_code = ANY(p_branch_ids)
        OR branch_name = ANY(p_branch_ids)
    );
-- Derived Calculations
v_total_distance := ROUND(v_total_visits * 2.2, 1);
v_total_time := v_total_visits * 15;
-- 15 minutes per visit
IF v_active_routes > 0 THEN v_avg_visits := ROUND(v_total_visits::NUMERIC / v_active_routes, 1);
ELSE v_avg_visits := 0;
END IF;
-- Time Per User (hours) = total time (minutes) / 60 / number of users
IF v_total_users > 0 THEN v_time_per_user := ROUND((v_total_time::NUMERIC / 60) / v_total_users, 1);
ELSE v_time_per_user := 0;
END IF;
-- Frequency = average visits per customer per week (assuming 4 weeks of data)
IF v_total_customers > 0 THEN v_frequency := ROUND(
    v_total_visits::NUMERIC / v_total_customers / 4,
    1
);
ELSE v_frequency := 0;
END IF;
-- Efficiency = percentage of customers with GPS coordinates
SELECT ROUND(
        100.0 * COUNT(
            DISTINCT CASE
                WHEN lat IS NOT NULL
                AND lng IS NOT NULL THEN client_code
            END
        ) / NULLIF(COUNT(DISTINCT client_code), 0),
        0
    ) INTO v_efficiency
FROM company_uploaded_data
WHERE company_id = p_company_id
    AND (
        p_branch_ids IS NULL
        OR array_length(p_branch_ids, 1) IS NULL
        OR branch_code = ANY(p_branch_ids)
        OR branch_name = ANY(p_branch_ids)
    );
-- Route Health Analysis - filtered by branches
WITH route_counts AS (
    SELECT route_name,
        COUNT(*) as visit_count
    FROM company_uploaded_data
    WHERE company_id = p_company_id
        AND (
            p_branch_ids IS NULL
            OR array_length(p_branch_ids, 1) IS NULL
            OR branch_code = ANY(p_branch_ids)
            OR branch_name = ANY(p_branch_ids)
        )
    GROUP BY route_name
),
health_stats AS (
    SELECT COUNT(*) FILTER (
            WHERE visit_count BETWEEN 80 AND 120
        ) as stable,
        COUNT(*) FILTER (
            WHERE visit_count < 80
        ) as under,
        COUNT(*) FILTER (
            WHERE visit_count > 120
        ) as over
    FROM route_counts
)
SELECT row_to_json(health_stats)::JSONB INTO v_route_health
FROM health_stats;
-- Alerts
v_alerts := jsonb_build_object('missingGps', 0, 'proximityIssues', 0);
-- Construct Response
v_result := jsonb_build_object(
    'kpis',
    jsonb_build_object(
        'totalCustomers',
        v_total_customers,
        'activeRoutes',
        v_active_routes,
        'totalVisits',
        v_total_visits,
        'totalDistance',
        v_total_distance,
        'totalTime',
        v_total_time,
        'avgVisitsPerRoute',
        v_avg_visits,
        'timePerUser',
        v_time_per_user,
        'frequency',
        v_frequency,
        'efficiency',
        COALESCE(v_efficiency, 100)
    ),
    'routeHealth',
    v_route_health,
    'alerts',
    v_alerts
);
RETURN v_result;
END;
$$;
-- Grant permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats_from_upload(TEXT, TEXT []) TO authenticated,
    service_role,
    anon;
-- Refresh schema cache
NOTIFY pgrst,
'reload schema';