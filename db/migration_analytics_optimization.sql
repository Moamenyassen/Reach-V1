-- ==========================================
-- ANALYTICS & DASHBOARD OPTIMIZATION
-- Migration Script: Views & RPC Functions
-- ==========================================
-- 0. PERFORMANCE INDEXES (CRITICAL FOR SCALE)
-- ==========================================
-- Ensure foreign keys are indexed for fast JOINs in Views
CREATE INDEX IF NOT EXISTS idx_routes_branch_id ON routes(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON normalized_customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_route_visits_route_id ON route_visits(route_id);
-- Filter Indexes (for "is_active" and "is_visited" predicates)
CREATE INDEX IF NOT EXISTS idx_routes_is_active ON routes(is_active)
WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_route_visits_is_visited ON route_visits(is_visited);
-- 1. ANALYTICAL VIEWS
-- ==========================================
-- View: view_branch_stats
-- Purpose: High-level KPIs per branch
CREATE OR REPLACE VIEW view_branch_stats AS
SELECT b.id AS branch_id,
    b.name_en AS branch_name,
    b.company_id,
    -- Metrics
    (
        SELECT COUNT(*)
        FROM normalized_customers c
        WHERE c.branch_id = b.id
    ) AS total_customers,
    (
        SELECT COUNT(*)
        FROM routes r
        WHERE r.branch_id = b.id
            AND r.is_active = true
    ) AS active_routes,
    -- Scheduled Visits (Linked via Routes)
    COUNT(rv.id) AS scheduled_visits,
    -- Visited Count
    COUNT(
        CASE
            WHEN rv.is_visited = true THEN 1
        END
    ) AS visited_count,
    -- Efficiency Calculation (Avoid division by zero)
    CASE
        WHEN COUNT(rv.id) = 0 THEN 0
        ELSE ROUND(
            (
                COUNT(
                    CASE
                        WHEN rv.is_visited = true THEN 1
                    END
                )::NUMERIC / COUNT(rv.id)::NUMERIC
            ) * 100,
            1
        )
    END AS completion_rate
FROM branches b
    LEFT JOIN routes r ON r.branch_id = b.id
    LEFT JOIN route_visits rv ON rv.route_id = r.id
GROUP BY b.id,
    b.name_en,
    b.company_id;
-- View: view_route_performance
-- Purpose: Granular performance per route/rep
CREATE OR REPLACE VIEW view_route_performance AS
SELECT r.id AS route_id,
    r.name AS route_name,
    r.rep_code,
    r.branch_id,
    r.company_id,
    -- Stops Logic
    COUNT(rv.id) AS total_stops,
    COUNT(
        CASE
            WHEN rv.is_visited = true THEN 1
        END
    ) AS visited_stops,
    (
        COUNT(rv.id) - COUNT(
            CASE
                WHEN rv.is_visited = true THEN 1
            END
        )
    ) AS pending_stops,
    -- Efficiency
    CASE
        WHEN COUNT(rv.id) = 0 THEN 0
        ELSE ROUND(
            (
                COUNT(
                    CASE
                        WHEN rv.is_visited = true THEN 1
                    END
                )::NUMERIC / COUNT(rv.id)::NUMERIC
            ) * 100,
            1
        )
    END AS efficiency_score
FROM routes r
    LEFT JOIN route_visits rv ON rv.route_id = r.id
WHERE r.is_active = true
GROUP BY r.id,
    r.name,
    r.rep_code,
    r.branch_id,
    r.company_id;
-- 2. DYNAMIC RPC FUNCTION (Frontend API)
-- ==========================================
-- Function: get_dashboard_summary
-- Params: target_branch_id (UUID or NULL for All)
-- Returns: JSON Object
CREATE OR REPLACE FUNCTION get_dashboard_summary(target_branch_id UUID DEFAULT NULL) RETURNS JSON AS $$
DECLARE v_total_visits INTEGER;
v_active_routes INTEGER;
v_efficiency NUMERIC;
v_top_performer TEXT;
v_company_id TEXT;
BEGIN -- Get current company context (RLS)
-- Assumes app.company_id is set by middleware/auth trigger
-- If using Supabase auth.uid(), you might join auth.users instead, 
-- but usually 'app.company_id' is a custom session variable.
-- Fallback to a simplified check if needed, but keeping original logic.
BEGIN v_company_id := current_setting('app.company_id', true);
EXCEPTION
WHEN OTHERS THEN v_company_id := NULL;
-- Handle case where setting isn't set
END;
-- 1. Calculate Aggregates based on Scope
-- Note: If company_id is NULL/Global admin, they might see everything, or nothing. 
-- Adding check for v_company_id being NOT NULL usually required for SaaS.
-- Assuming RLS policies on underlying tables handle strict security, 
-- but for the VIEW aggregation, we filter manually here to match the view definition style.
SELECT COALESCE(SUM(scheduled_visits), 0),
    COALESCE(SUM(active_routes), 0),
    CASE
        WHEN SUM(scheduled_visits) = 0 THEN 0
        ELSE ROUND(
            (
                SUM(visited_count)::NUMERIC / SUM(scheduled_visits)::NUMERIC
            ) * 100,
            1
        )
    END INTO v_total_visits,
    v_active_routes,
    v_efficiency
FROM view_branch_stats
WHERE (
        v_company_id IS NULL
        OR company_id = v_company_id
    )
    AND (
        target_branch_id IS NULL
        OR branch_id = target_branch_id
    );
-- 2. Find Top Performer (Route with highest visits)
SELECT route_name INTO v_top_performer
FROM view_route_performance
WHERE (
        v_company_id IS NULL
        OR company_id = v_company_id
    )
    AND (
        target_branch_id IS NULL
        OR branch_id = target_branch_id
    )
ORDER BY visited_stops DESC,
    efficiency_score DESC
LIMIT 1;
-- 3. Return Plain JSON
RETURN json_build_object(
    'total_visits',
    v_total_visits,
    'active_routes',
    v_active_routes,
    'efficiency_score',
    v_efficiency,
    'top_performer_name',
    COALESCE(v_top_performer, 'N/A')
);
END;
$$ LANGUAGE plpgsql;
-- Grant access to authenticated users
GRANT SELECT ON view_branch_stats TO authenticated;
GRANT SELECT ON view_route_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_summary TO authenticated;
-- 3. MAP VIEWPORT QUERY (Geo-Spatial Optimization)
-- ==========================================
-- Function: get_map_points
-- Params: Bounds (min/max lat/lng)
-- Returns: Lightweight customer points
CREATE OR REPLACE FUNCTION get_map_points(
        min_lat FLOAT,
        min_lng FLOAT,
        max_lat FLOAT,
        max_lng FLOAT,
        company_filter TEXT DEFAULT NULL
    ) RETURNS TABLE (
        id UUID,
        lat FLOAT,
        lng FLOAT,
        status TEXT,
        -- derived or actual status
        name TEXT
    ) AS $$ BEGIN RETURN QUERY
SELECT c.id,
    c.lat,
    c.lng,
    CASE
        WHEN c.is_visited THEN 'visited'
        ELSE 'pending'
    END AS status,
    c.name
FROM normalized_customers c
WHERE c.lat BETWEEN min_lat AND max_lat
    AND c.lng BETWEEN min_lng AND max_lng
    AND (
        company_filter IS NULL
        OR c.company_id = company_filter
    )
LIMIT 2000;
-- Safety cap
END;
$$ LANGUAGE plpgsql;
GRANT EXECUTE ON FUNCTION get_map_points TO authenticated;