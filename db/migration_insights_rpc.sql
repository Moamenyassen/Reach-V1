-- Function to get dashboard stats DIRECTLY from the uploaded source of truth
-- This avoids loading 40k+ rows to frontend and ensures numbers match the upload screen.
CREATE OR REPLACE FUNCTION get_dashboard_stats_from_upload(p_company_id TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_total_customers INT;
v_active_routes INT;
v_total_visits INT;
v_total_distance NUMERIC;
v_total_time NUMERIC;
v_avg_visits NUMERIC;
v_route_health JSONB;
v_alerts JSONB;
v_result JSONB;
BEGIN -- 1. Calculate Basis Stats from company_uploaded_data (Source of Truth)
-- We filter by company_id to ensure tenant isolation
-- Total Visits (Rows)
SELECT COUNT(*) INTO v_total_visits
FROM company_uploaded_data
WHERE company_id = p_company_id;
-- Total Customers (Distinct Client Code)
SELECT COUNT(DISTINCT client_code) INTO v_total_customers
FROM company_uploaded_data
WHERE company_id = p_company_id;
-- Active Routes (Distinct Route Name)
SELECT COUNT(DISTINCT route_name) INTO v_active_routes
FROM company_uploaded_data
WHERE company_id = p_company_id;
-- 2. Derived Calculations (Estimates based on current frontend logic)
-- Distance: ~2.2km per visit
v_total_distance := ROUND(v_total_visits * 2.2, 1);
-- Time: ~15 mins per visit (converted to minutes)
v_total_time := v_total_visits * 15;
-- Avg Visits per Route
IF v_active_routes > 0 THEN v_avg_visits := ROUND(v_total_visits::NUMERIC / v_active_routes, 1);
ELSE v_avg_visits := 0;
END IF;
-- 3. Route Health Analysis (Group by Route Name)
WITH route_counts AS (
    SELECT route_name,
        COUNT(*) as visit_count
    FROM company_uploaded_data
    WHERE company_id = p_company_id
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
-- 4. Alerts (Basic checks on data quality)
-- For now, we assume 0 specific alerts unless we add logic to check Lat/Lng validity
v_alerts := jsonb_build_object(
    'missingGps',
    0,
    'proximityIssues',
    0
);
-- 5. Construct Final JSON Response
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
        0,
        -- Placeholder or calculate if Rep logic added
        'frequency',
        0,
        -- Placeholder
        'efficiency',
        100 -- Placeholder, assumed ideal
    ),
    'routeHealth',
    v_route_health,
    'alerts',
    v_alerts
);
RETURN v_result;
END;
$$;