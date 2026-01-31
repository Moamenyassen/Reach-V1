-- ==========================================
-- ANALYTICS & DASHBOARD OPTIMIZATION
-- Migration Script: Views & RPC Functions
-- ==========================================
-- 0. SCHEMA UPDATE (Ensure we can track status)
-- Adding 'is_visited' to route_visits if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'route_visits'
        AND column_name = 'is_visited'
) THEN
ALTER TABLE route_visits
ADD COLUMN is_visited BOOLEAN DEFAULT false;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'route_visits'
        AND column_name = 'completed_at'
) THEN
ALTER TABLE route_visits
ADD COLUMN completed_at TIMESTAMPTZ;
END IF;
END $$;
-- ==========================================
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
-- ==========================================
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
v_company_id := current_setting('app.company_id', true);
-- 1. Calculate Aggregates based on Scope
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
WHERE company_id = v_company_id
    AND (
        target_branch_id IS NULL
        OR branch_id = target_branch_id
    );
-- 2. Find Top Performer (Route with highest visits)
SELECT route_name INTO v_top_performer
FROM view_route_performance
WHERE company_id = v_company_id
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