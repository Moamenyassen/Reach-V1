-- 1. Add missing name_ar column to company_branches if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'company_branches'
        AND column_name = 'name_ar'
) THEN
ALTER TABLE company_branches
ADD COLUMN name_ar TEXT;
END IF;
END $$;
-- 2. Fix views using the old 'branches' table reference
CREATE OR REPLACE VIEW view_branch_stats AS
SELECT b.id AS branch_id,
    b.name_en AS branch_name,
    b.company_id,
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
    COUNT(rv.id) AS scheduled_visits,
    COUNT(
        CASE
            WHEN rv.is_visited = true THEN 1
        END
    ) AS visited_count,
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
FROM company_branches b
    LEFT JOIN routes r ON r.branch_id = b.id
    LEFT JOIN route_visits rv ON rv.route_id = r.id
GROUP BY b.id,
    b.name_en,
    b.company_id;
CREATE OR REPLACE VIEW view_route_performance AS
SELECT r.id AS route_id,
    r.name AS route_name,
    r.rep_code,
    r.branch_id,
    r.company_id,
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
-- 3. Notify PostgREST to reload schema
NOTIFY pgrst,
'reload schema';