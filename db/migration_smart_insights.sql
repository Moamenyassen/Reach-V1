-- SMART INSIGHTS: Distance, Time, Efficiency, Frequency, Proximity
-- Updated to respect RLS / User Assignments
CREATE OR REPLACE FUNCTION get_dashboard_stats_from_upload(p_company_id TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_total_customers INT;
v_active_routes INT;
v_total_visits INT;
v_total_distance NUMERIC;
v_total_time NUMERIC;
v_avg_visits NUMERIC;
v_frequency NUMERIC;
v_time_per_user NUMERIC;
v_efficiency INT;
v_missing_gps INT;
v_proximity_issues INT;
v_route_health JSONB;
v_alerts JSONB;
v_result JSONB;
v_min_clients INT;
v_max_clients INT;
-- User Context
_is_admin BOOLEAN;
_user_branches TEXT [];
_user_routes TEXT [];
BEGIN -- 0. Determine User Access
-- We can re-use the helper functions we defined in RLS migration
-- checks: is_admin_or_manager(), get_user_branch_ids(), get_user_route_ids()
SELECT is_admin_or_manager() INTO _is_admin;
SELECT get_user_branch_ids() INTO _user_branches;
SELECT get_user_route_ids() INTO _user_routes;
-- 1. Basis Stats (Filtered)
SELECT COUNT(*) INTO v_total_visits
FROM company_uploaded_data d
WHERE d.company_id = p_company_id
    AND (
        _is_admin
        OR d.branch_name = ANY(_user_branches) -- FIXED: Match Name
        OR d.route_name = ANY(_user_routes)
    );
SELECT COUNT(DISTINCT client_code) INTO v_total_customers
FROM company_uploaded_data d
WHERE d.company_id = p_company_id
    AND (
        _is_admin
        OR d.branch_name = ANY(_user_branches) -- FIXED: Match Name
        OR d.route_name = ANY(_user_routes)
    );
SELECT COUNT(DISTINCT route_name) INTO v_active_routes
FROM company_uploaded_data d
WHERE d.company_id = p_company_id
    AND (
        _is_admin
        OR d.branch_name = ANY(_user_branches) -- FIXED: Match Name
        OR d.route_name = ANY(_user_routes)
    );
-- FETCH SETTINGS (or default to 80-120)
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
-- 2. SMART CALCULATIONS (Geospatial) - Filtered
WITH route_points AS (
    SELECT route_name,
        lat,
        lng,
        LAG(lat) OVER (
            PARTITION BY route_name
            ORDER BY lat DESC
        ) as prev_lat,
        LAG(lng) OVER (
            PARTITION BY route_name
            ORDER BY lat DESC
        ) as prev_lng
    FROM company_uploaded_data d
    WHERE company_id = p_company_id
        AND lat IS NOT NULL
        AND lat != 0
        AND (
            _is_admin
            OR d.branch_name = ANY(_user_branches)
            OR d.route_name = ANY(_user_routes)
        )
)
SELECT COALESCE(
        SUM(
            6371 * acos(
                GREATEST(
                    -1,
                    LEAST(
                        1,
                        cos(radians(prev_lat)) * cos(radians(lat)) * cos(radians(lng) - radians(prev_lng)) + sin(radians(prev_lat)) * sin(radians(lat))
                    )
                )
            )
        ),
        0
    ) INTO v_total_distance
FROM route_points
WHERE prev_lat IS NOT NULL;
-- Add 20% buffer for road curvature
v_total_distance := ROUND(v_total_distance * 1.2, 1);
-- Time: Travel (35km/h) + Service (8 mins/visit)
v_total_time := (v_total_distance / 35) * 60 + (v_total_visits * 8);
-- Avg Visits
IF v_active_routes > 0 THEN v_avg_visits := ROUND(v_total_visits::NUMERIC / v_active_routes, 1);
ELSE v_avg_visits := 0;
END IF;
-- Frequency: Visits / Customers
IF v_total_customers > 0 THEN v_frequency := ROUND(v_total_visits::NUMERIC / v_total_customers, 1);
ELSE v_frequency := 0;
END IF;
-- Time/User (Hrs): Total Time / Active Routes
IF v_active_routes > 0 THEN v_time_per_user := ROUND((v_total_time / 60.0) / v_active_routes, 1);
ELSE v_time_per_user := 0;
END IF;
-- Efficiency: Service Time / Total Time
IF v_total_time > 0 THEN v_efficiency := ROUND(((v_total_visits * 8.0) / v_total_time) * 100);
ELSE v_efficiency := 100;
END IF;
-- 3. Route Health (Based on UNIQUE CUSTOMERS) - Filtered
WITH route_counts AS (
    SELECT route_name,
        COUNT(DISTINCT client_code) as customer_count
    FROM company_uploaded_data d
    WHERE company_id = p_company_id
        AND (
            _is_admin
            OR d.branch_name = ANY(_user_branches)
            OR d.route_name = ANY(_user_routes)
        )
    GROUP BY route_name
),
health_stats AS (
    SELECT -- Target: Dynamic based on company settings
        COUNT(*) FILTER (
            WHERE customer_count BETWEEN v_min_clients AND v_max_clients
        ) as stable,
        COUNT(*) FILTER (
            WHERE customer_count < v_min_clients
        ) as under,
        COUNT(*) FILTER (
            WHERE customer_count > v_max_clients
        ) as over
    FROM route_counts
)
SELECT row_to_json(health_stats)::JSONB INTO v_route_health
FROM health_stats;
-- 4. Alerts - Filtered
-- Missing GPS
SELECT COUNT(DISTINCT client_code) INTO v_missing_gps
FROM company_uploaded_data d
WHERE company_id = p_company_id
    AND (
        lat IS NULL
        OR lat = 0
        OR lng IS NULL
        OR lng = 0
    )
    AND (
        _is_admin
        OR d.branch_name = ANY(_user_branches)
        OR d.route_name = ANY(_user_routes)
    );
-- Proximity Issues
WITH location_duplicates AS (
    SELECT lat,
        lng
    FROM company_uploaded_data d
    WHERE company_id = p_company_id
        AND lat IS NOT NULL
        AND lat != 0
        AND (
            _is_admin
            OR d.branch_name = ANY(_user_branches)
            OR d.route_name = ANY(_user_routes)
        )
    GROUP BY lat,
        lng
    HAVING COUNT(DISTINCT client_code) > 1
)
SELECT COUNT(DISTINCT client_code) INTO v_proximity_issues
FROM company_uploaded_data d
WHERE company_id = p_company_id
    AND (lat, lng) IN (
        SELECT lat,
            lng
        FROM location_duplicates
    )
    AND (
        _is_admin
        OR d.branch_name = ANY(_user_branches)
        OR d.route_name = ANY(_user_routes)
    );
v_alerts := jsonb_build_object(
    'missingGps',
    v_missing_gps,
    'proximityIssues',
    v_proximity_issues
);
-- 5. Result
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
        v_efficiency
    ),
    'routeHealth',
    v_route_health,
    'alerts',
    v_alerts
);
RETURN v_result;
END;
$$;