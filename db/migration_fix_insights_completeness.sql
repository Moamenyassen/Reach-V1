-- ============================================================================
-- MIGRATION: Fix Insights Logic - Restore Health, Alerts & Correct Keys
-- This migration updates get_dashboard_stats_from_upload to:
-- 1. support branch filtering (p_branch_ids)
-- 2. return ALL required data sections (kpis, routeHealth, alerts)
-- 3. use correct JSON keys expected by frontend (e.g. totalDistance vs totalDistanceKm)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats_from_upload(
        p_company_id TEXT,
        p_branch_ids TEXT [] DEFAULT NULL
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE -- KPI Variables
    v_total_branches INT;
v_total_routes INT;
v_total_customers INT;
v_total_visits INT;
v_total_distance NUMERIC;
v_total_time NUMERIC;
v_avg_visits NUMERIC;
v_time_per_user NUMERIC;
v_frequency NUMERIC;
v_efficiency NUMERIC;
v_active_routes INT;
-- Health & Alerts Variables
v_min_clients INT;
v_max_clients INT;
v_route_health JSONB;
v_missing_gps INT;
v_proximity_issues INT;
v_alerts JSONB;
v_result JSONB;
BEGIN -- 1. GET SETTINGS (Min/Max Clients per Route)
SELECT COALESCE(
        (
            settings->'modules'->'insights'->>'minClientsPerRoute'
        )::INT,
        80
    ),
    COALESCE(
        (
            settings->'modules'->'insights'->>'maxClientsPerRoute'
        )::INT,
        120
    ) INTO v_min_clients,
    v_max_clients
FROM companies
WHERE id = p_company_id;
-- 2. BASIC KPIS (With Branch Filter)
-- Total Customers
SELECT COUNT(DISTINCT client_code) INTO v_total_customers
FROM company_uploaded_data
WHERE company_id = p_company_id
    AND (
        p_branch_ids IS NULL
        OR array_length(p_branch_ids, 1) IS NULL
        OR branch_code = ANY(p_branch_ids)
        OR branch_name = ANY(p_branch_ids)
    );
-- Total Visits
SELECT COUNT(*) INTO v_total_visits
FROM company_uploaded_data
WHERE company_id = p_company_id
    AND (
        p_branch_ids IS NULL
        OR array_length(p_branch_ids, 1) IS NULL
        OR branch_code = ANY(p_branch_ids)
        OR branch_name = ANY(p_branch_ids)
    );
-- Active Routes (Routes with data)
SELECT COUNT(DISTINCT route_name) INTO v_active_routes
FROM company_uploaded_data
WHERE company_id = p_company_id
    AND (
        p_branch_ids IS NULL
        OR array_length(p_branch_ids, 1) IS NULL
        OR branch_code = ANY(p_branch_ids)
        OR branch_name = ANY(p_branch_ids)
    );
-- Total Branches
SELECT COUNT(DISTINCT branch_code) INTO v_total_branches
FROM company_uploaded_data
WHERE company_id = p_company_id
    AND (
        p_branch_ids IS NULL
        OR array_length(p_branch_ids, 1) IS NULL
        OR branch_code = ANY(p_branch_ids)
        OR branch_name = ANY(p_branch_ids)
    );
-- 3. DERIVED METRICS CALCULATIONS
-- Estimation: 2.2km per visit
v_total_distance := ROUND(v_total_visits * 2.2, 1);
-- Estimation: 15 mins per visit
v_total_time := v_total_visits * 15;
-- Avg Visits per Route
IF v_active_routes > 0 THEN v_avg_visits := ROUND(v_total_visits::NUMERIC / v_active_routes, 1);
ELSE v_avg_visits := 0;
END IF;
-- Time Per User (Assuming 1 User per Route for simplicity in this view, or distinct rep_code)
-- Better: Count distinct Reps
DECLARE v_total_reps INT;
BEGIN
SELECT COUNT(DISTINCT rep_code) INTO v_total_reps
FROM company_uploaded_data
WHERE company_id = p_company_id
    AND rep_code IS NOT NULL
    AND (
        p_branch_ids IS NULL
        OR array_length(p_branch_ids, 1) IS NULL
        OR branch_code = ANY(p_branch_ids)
        OR branch_name = ANY(p_branch_ids)
    );
IF v_total_reps > 0 THEN v_time_per_user := ROUND((v_total_time::NUMERIC / 60) / v_total_reps, 1);
ELSE v_time_per_user := 0;
END IF;
END;
-- Frequency (Visits / Customers / 4 weeks)
IF v_total_customers > 0 THEN v_frequency := ROUND(
    v_total_visits::NUMERIC / v_total_customers / 4,
    1
);
ELSE v_frequency := 0;
END IF;
-- Efficiency (GPS Coverage %)
SELECT ROUND(
        100.0 * COUNT(
            CASE
                WHEN lat IS NOT NULL
                AND lng IS NOT NULL THEN 1
            END
        ) / NULLIF(COUNT(*), 0),
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
-- 4. ROUTE HEALTH (Stable/Under/Over)
WITH route_counts AS (
    SELECT route_name,
        COUNT(DISTINCT client_code) as customer_count
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
            WHERE customer_count BETWEEN v_min_clients AND v_max_clients
        ) as stable,
        COUNT(*) FILTER (
            WHERE customer_count < v_min_clients
        ) as under,
        COUNT(*) FILTER (
            WHERE customer_count > v_max_clients
        ) as over,
        COUNT(*) as total
    FROM route_counts
)
SELECT row_to_json(health_stats)::JSONB INTO v_route_health
FROM health_stats;
-- 5. ALERTS
-- Missing GPS (Count of customers with no GPS)
SELECT COUNT(DISTINCT client_code) INTO v_missing_gps
FROM company_uploaded_data
WHERE company_id = p_company_id
    AND (
        lat IS NULL
        OR lat = 0
        OR lng IS NULL
        OR lng = 0
    )
    AND (
        p_branch_ids IS NULL
        OR array_length(p_branch_ids, 1) IS NULL
        OR branch_code = ANY(p_branch_ids)
        OR branch_name = ANY(p_branch_ids)
    );
-- Proximity Issues (Duplicate coords)
WITH location_duplicates AS (
    SELECT lat,
        lng
    FROM company_uploaded_data
    WHERE company_id = p_company_id
        AND lat IS NOT NULL
        AND lat != 0
        AND (
            p_branch_ids IS NULL
            OR array_length(p_branch_ids, 1) IS NULL
            OR branch_code = ANY(p_branch_ids)
            OR branch_name = ANY(p_branch_ids)
        )
    GROUP BY lat,
        lng
    HAVING COUNT(DISTINCT client_code) > 1
)
SELECT COUNT(DISTINCT c.client_code) INTO v_proximity_issues
FROM company_uploaded_data c
WHERE c.company_id = p_company_id
    AND (c.lat, c.lng) IN (
        SELECT lat,
            lng
        FROM location_duplicates
    )
    AND (
        p_branch_ids IS NULL
        OR array_length(p_branch_ids, 1) IS NULL
        OR c.branch_code = ANY(p_branch_ids)
        OR c.branch_name = ANY(p_branch_ids)
    );
v_alerts := jsonb_build_object(
    'missingGps',
    v_missing_gps,
    'proximityIssues',
    v_proximity_issues
);
-- 6. CONSTRUCT RESULT
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
        COALESCE(v_efficiency, 100),
        'totalBranches',
        v_total_branches
    ),
    'routeHealth',
    v_route_health,
    'alerts',
    v_alerts,
    'mapData',
    '[]'::jsonb
);
RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION get_dashboard_stats_from_upload(TEXT, TEXT []) TO authenticated,
    service_role,
    anon;