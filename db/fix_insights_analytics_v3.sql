-- ==========================================
-- INSIGHTS DASHBOARD KPI OPTIMIZATION V3
-- ==========================================
-- 1. Performance Indexes for Normalized Schema
CREATE INDEX IF NOT EXISTS idx_normalized_customers_company_active ON normalized_customers(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_routes_company_active ON routes(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_route_visits_company_date ON route_visits(company_id, completed_at)
WHERE is_visited = true;
CREATE INDEX IF NOT EXISTS idx_route_visits_not_visited ON route_visits(company_id)
WHERE is_visited = false;
-- 2. Master Aggregator RPC
CREATE OR REPLACE FUNCTION get_insights_dashboard_kpi(
        p_company_id TEXT,
        p_min_clients INTEGER DEFAULT 50,
        p_max_clients INTEGER DEFAULT 110,
        p_nearby_radius_meters INTEGER DEFAULT 100
    ) RETURNS JSON AS $$
DECLARE v_total_customers INTEGER;
v_active_routes INTEGER;
v_total_visits_count INTEGER;
v_total_time_min NUMERIC;
v_total_distance_km NUMERIC;
v_avg_visits_per_route NUMERIC;
v_time_per_user NUMERIC;
v_frequency NUMERIC;
v_efficiency NUMERIC;
v_stable_routes INTEGER;
v_under_routes INTEGER;
v_over_routes INTEGER;
v_missing_gps INTEGER;
v_proximity_issues INTEGER;
BEGIN -- Basic Counts
SELECT COUNT(*) INTO v_total_customers
FROM normalized_customers
WHERE company_id = p_company_id
    AND is_active = true;
SELECT COUNT(*) INTO v_active_routes
FROM routes
WHERE company_id = p_company_id
    AND is_active = true;
-- Operational Metrics (Planned)
-- Removed is_visited=true filter to show Total Operations Load instead of History
SELECT COUNT(*),
    COALESCE(SUM(estimated_duration_min), 0) INTO v_total_visits_count,
    v_total_time_min
FROM route_visits
WHERE company_id = p_company_id;
-- Estimate Distance (2.2km per stop)
v_total_distance_km := v_total_visits_count * 2.2;
-- Route Health (Aggregated)
-- Count DISTINCT customers to avoid double-counting multi-visit clients
WITH route_counts AS (
    SELECT r.id as route_id,
        COUNT(DISTINCT rv.customer_id) as c_count
    FROM routes r
        LEFT JOIN route_visits rv ON r.id = rv.route_id
        AND rv.company_id = p_company_id -- Explicit partitioning match
    WHERE r.company_id = p_company_id
        AND r.is_active = true
    GROUP BY r.id
)
SELECT COUNT(*) FILTER (
        WHERE c_count >= p_min_clients
            AND c_count <= p_max_clients
    ),
    COUNT(*) FILTER (
        WHERE c_count < p_min_clients
    ),
    COUNT(*) FILTER (
        WHERE c_count > p_max_clients
    ) INTO v_stable_routes,
    v_under_routes,
    v_over_routes
FROM route_counts;
-- Efficiency Calculation (Smart Weighted Score)
-- Stable = 100%, Overloaded = 70% (Risk), Under = 50% (Waste)
IF v_active_routes > 0 THEN v_efficiency := ROUND(
    (
        (COALESCE(v_stable_routes, 0)::NUMERIC * 1.0) + (COALESCE(v_over_routes, 0)::NUMERIC * 0.7) + (COALESCE(v_under_routes, 0)::NUMERIC * 0.5)
    ) / v_active_routes::NUMERIC * 100,
    1
);
ELSE v_efficiency := 0;
END IF;
-- Frequency: Visits per Customer
IF v_total_customers > 0 THEN v_frequency := ROUND(
    v_total_visits_count::NUMERIC / v_total_customers::NUMERIC,
    2
);
ELSE v_frequency := 0;
END IF;
-- Secondary KPIs
IF v_active_routes > 0 THEN v_avg_visits_per_route := ROUND(
    v_total_visits_count::NUMERIC / v_active_routes::NUMERIC,
    1
);
v_time_per_user := ROUND(
    (
        v_total_time_min::NUMERIC / v_active_routes::NUMERIC
    ) / 60.0,
    1
);
ELSE v_avg_visits_per_route := 0;
v_time_per_user := 0;
END IF;
-- Alerts 1: Missing GPS
SELECT COUNT(*) INTO v_missing_gps
FROM normalized_customers
WHERE company_id = p_company_id
    AND is_active = true
    AND (
        lat IS NULL
        OR lng IS NULL
        OR lat = 0
        OR lng = 0
    );
-- Alerts 2: Proximity Issues (Customers too close to Branch)
-- Using Haversine Formula (6371 * acos(...))
-- p_nearby_radius_meters default 100m. Result in KM, so compare to meters/1000
SELECT COUNT(*) INTO v_proximity_issues
FROM normalized_customers c
    JOIN branches b ON c.branch_id = b.id
WHERE c.company_id = p_company_id
    AND c.is_active = true
    AND c.lat != 0
    AND c.lng != 0
    AND b.lat != 0
    AND b.lng != 0
    AND (
        6371 * acos(
            cos(radians(b.lat)) * cos(radians(c.lat)) * cos(radians(c.lng) - radians(b.lng)) + sin(radians(b.lat)) * sin(radians(c.lat))
        )
    ) < (p_nearby_radius_meters::NUMERIC / 1000.0);
-- Final JSON Build
RETURN json_build_object(
    'kpis',
    json_build_object(
        'totalCustomers',
        v_total_customers,
        'activeRoutes',
        v_active_routes,
        'totalVisits',
        v_total_visits_count,
        'totalDistance',
        v_total_distance_km,
        'totalTime',
        v_total_time_min,
        'avgVisitsPerRoute',
        v_avg_visits_per_route,
        'timePerUser',
        v_time_per_user,
        'frequency',
        v_frequency,
        'efficiency',
        v_efficiency
    ),
    'routeHealth',
    json_build_object(
        'stable',
        COALESCE(v_stable_routes, 0),
        'under',
        COALESCE(v_under_routes, 0),
        'over',
        COALESCE(v_over_routes, 0)
    ),
    'alerts',
    json_build_object(
        'missingGps',
        v_missing_gps,
        'proximityIssues',
        COALESCE(v_proximity_issues, 0)
    )
);
END;
$$ LANGUAGE plpgsql;