-- ==========================================
-- Migration: Optimize Upload Process (RPC for Branch Detection)
-- ==========================================
-- Function: detect_and_upsert_branches
-- Description: Aggregates customer data to detect branches effectively on the server side
--              and upserts them into company_branches.
-- Returns: A table of detected branch codes and names.
CREATE OR REPLACE FUNCTION detect_and_upsert_branches(
        p_company_id TEXT,
        p_version_id UUID DEFAULT NULL
    ) RETURNS TABLE (
        code TEXT,
        name TEXT,
        is_new BOOLEAN,
        customer_count BIGINT
    ) LANGUAGE plpgsql AS $$
DECLARE v_active_version_id UUID;
BEGIN -- 1. Determine Version ID
IF p_version_id IS NOT NULL THEN v_active_version_id := p_version_id;
ELSE
SELECT active_version_id INTO v_active_version_id
FROM route_meta
WHERE company_id = p_company_id;
END IF;
-- 2. Aggregate Data from Customers (Grouping by Region/Branch)
--    We use a CTE to perform the heavy lifting (aggregation) first
WITH branch_stats AS (
    SELECT -- Normalize: Trim and Uppercase for Code, Trim for Name
        COALESCE(
            NULLIF(TRIM(region_code), ''),
            NULLIF(TRIM(region_description), ''),
            'UNASSIGNED'
        ) as raw_code,
        COALESCE(
            NULLIF(TRIM(region_description), ''),
            NULLIF(TRIM(region_code), ''),
            'Unassigned Region'
        ) as raw_name,
        AVG(lat) as avg_lat,
        AVG(lng) as avg_lng,
        COUNT(*) as c_count
    FROM customers
    WHERE company_id = p_company_id
        AND (
            v_active_version_id IS NULL
            OR version_id = v_active_version_id
        )
    GROUP BY COALESCE(
            NULLIF(TRIM(region_code), ''),
            NULLIF(TRIM(region_description), ''),
            'UNASSIGNED'
        ),
        COALESCE(
            NULLIF(TRIM(region_description), ''),
            NULLIF(TRIM(region_code), ''),
            'Unassigned Region'
        )
),
upserted_branches AS (
    INSERT INTO company_branches (company_id, code, name_en, lat, lng, is_active)
    SELECT p_company_id,
        -- Sanitize Code: Uppercase, alphanumeric + underscore, max 50 chars
        UPPER(
            REGEXP_REPLACE(raw_code, '[^a-zA-Z0-9]', '_', 'g')
        ),
        raw_name,
        CASE
            WHEN c_count > 0 THEN avg_lat
            ELSE NULL
        END,
        CASE
            WHEN c_count > 0 THEN avg_lng
            ELSE NULL
        END,
        true
    FROM branch_stats ON CONFLICT (company_id, code) DO
    UPDATE
    SET name_en = EXCLUDED.name_en,
        -- Update name if changed
        lat = COALESCE(EXCLUDED.lat, company_branches.lat),
        -- Update centroids
        lng = COALESCE(EXCLUDED.lng, company_branches.lng)
    RETURNING code,
        name_en,
        (xmax = 0) as is_batched_insert -- xmax=0 implies insert, otherwise update
)
SELECT ub.code,
    ub.name_en as name,
    ub.is_batched_insert as is_new,
    bs.c_count as customer_count
FROM upserted_branches ub
    JOIN branch_stats bs ON UPPER(
        REGEXP_REPLACE(bs.raw_code, '[^a-zA-Z0-9]', '_', 'g')
    ) = ub.code;
END;
$$;