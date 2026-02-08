-- Migration to add branch filtering to hierarchical report RPC
-- Run this in Supabase SQL editor
-- First drop the old function with old signature
DROP FUNCTION IF EXISTS get_hierarchical_report(text, text, text);
DROP FUNCTION IF EXISTS get_hierarchical_report(text, text, text, text []);
-- Recreate with branch_ids parameter
CREATE OR REPLACE FUNCTION get_hierarchical_report(
        p_company_id TEXT DEFAULT NULL,
        p_target_level TEXT DEFAULT 'BRANCH',
        p_parent_id TEXT DEFAULT NULL,
        p_branch_ids TEXT [] DEFAULT NULL -- NEW: Array of branch codes/names to filter
    ) RETURNS TABLE (
        level_type TEXT,
        parent_id TEXT,
        id TEXT,
        name TEXT,
        total_clients INTEGER,
        class_a_count INTEGER,
        class_b_count INTEGER,
        class_c_count INTEGER,
        supermarkets_count INTEGER,
        retail_count INTEGER,
        hypermarkets_count INTEGER,
        minimarkets_count INTEGER,
        districts_covered INTEGER,
        total_visits INTEGER
    ) LANGUAGE plpgsql AS $$ BEGIN -- BRANCH level
    IF p_target_level = 'BRANCH' THEN RETURN QUERY WITH client_base AS (
        SELECT branch_code,
            client_code,
            MAX(branch_name) as b_name,
            MAX(classification) as cls,
            MAX(store_type) as stype,
            MAX(district) as dst,
            COUNT(*) as visits
        FROM company_uploaded_data
        WHERE (
                p_company_id IS NULL
                OR company_id = p_company_id
            ) -- NEW: Filter by branch_ids if provided
            AND (
                p_branch_ids IS NULL
                OR array_length(p_branch_ids, 1) IS NULL
                OR branch_code = ANY(p_branch_ids)
                OR branch_name = ANY(p_branch_ids)
            )
        GROUP BY branch_code,
            client_code
    )
SELECT 'BRANCH'::TEXT,
    NULL::TEXT,
    branch_code,
    MAX(b_name),
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'A'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'B'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'C'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%SUPERMARKET%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%RETAIL%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%HYPERMARKET%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%MINIMARKET%'
    )::INTEGER,
    COUNT(DISTINCT dst)::INTEGER,
    SUM(visits)::INTEGER
FROM client_base
GROUP BY branch_code;
-- ROUTE level
ELSIF p_target_level = 'ROUTE' THEN RETURN QUERY WITH client_base AS (
    SELECT branch_code,
        route_name,
        client_code,
        MAX(classification) as cls,
        MAX(store_type) as stype,
        MAX(district) as dst,
        COUNT(*) as visits
    FROM company_uploaded_data
    WHERE (
            p_company_id IS NULL
            OR company_id = p_company_id
        )
        AND (
            p_parent_id IS NULL
            OR branch_code = p_parent_id
        ) -- NEW: Filter by branch_ids if provided
        AND (
            p_branch_ids IS NULL
            OR array_length(p_branch_ids, 1) IS NULL
            OR branch_code = ANY(p_branch_ids)
            OR branch_name = ANY(p_branch_ids)
        )
    GROUP BY branch_code,
        route_name,
        client_code
)
SELECT 'ROUTE'::TEXT,
    branch_code,
    route_name,
    route_name,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'A'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'B'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'C'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%SUPERMARKET%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%RETAIL%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%HYPERMARKET%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%MINIMARKET%'
    )::INTEGER,
    COUNT(DISTINCT dst)::INTEGER,
    SUM(visits)::INTEGER
FROM client_base
GROUP BY branch_code,
    route_name;
-- USER level
ELSIF p_target_level = 'USER' THEN RETURN QUERY WITH client_base AS (
    SELECT route_name,
        rep_code,
        client_code,
        MAX(classification) as cls,
        MAX(store_type) as stype,
        MAX(district) as dst,
        COUNT(*) as visits
    FROM company_uploaded_data
    WHERE (
            p_company_id IS NULL
            OR company_id = p_company_id
        )
        AND (
            p_parent_id IS NULL
            OR route_name = p_parent_id
        )
    GROUP BY route_name,
        rep_code,
        client_code
)
SELECT 'USER'::TEXT,
    route_name,
    rep_code,
    MAX(rep_code),
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'A'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'B'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'C'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%SUPERMARKET%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%RETAIL%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%HYPERMARKET%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%MINIMARKET%'
    )::INTEGER,
    COUNT(DISTINCT dst)::INTEGER,
    SUM(visits)::INTEGER
FROM client_base
GROUP BY route_name,
    rep_code;
-- WEEK level
ELSIF p_target_level = 'WEEK' THEN RETURN QUERY WITH client_base AS (
    SELECT rep_code,
        week_number,
        client_code,
        MAX(classification) as cls,
        MAX(store_type) as stype,
        MAX(district) as dst,
        COUNT(*) as visits
    FROM company_uploaded_data
    WHERE (
            p_company_id IS NULL
            OR company_id = p_company_id
        )
        AND (
            p_parent_id IS NULL
            OR rep_code = p_parent_id
        )
    GROUP BY rep_code,
        week_number,
        client_code
)
SELECT 'WEEK'::TEXT,
    rep_code,
    rep_code || '_' || week_number,
    week_number,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'A'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'B'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'C'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%SUPERMARKET%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%RETAIL%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%HYPERMARKET%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%MINIMARKET%'
    )::INTEGER,
    COUNT(DISTINCT dst)::INTEGER,
    SUM(visits)::INTEGER
FROM client_base
GROUP BY rep_code,
    week_number;
-- DAY level
ELSIF p_target_level = 'DAY' THEN RETURN QUERY WITH client_base AS (
    SELECT rep_code,
        week_number,
        day_name,
        client_code,
        MAX(classification) as cls,
        MAX(store_type) as stype,
        MAX(district) as dst,
        COUNT(*) as visits
    FROM company_uploaded_data
    WHERE (
            p_company_id IS NULL
            OR company_id = p_company_id
        )
        AND (
            p_parent_id IS NULL
            OR (rep_code || '_' || week_number) = p_parent_id
        )
    GROUP BY rep_code,
        week_number,
        day_name,
        client_code
)
SELECT 'DAY'::TEXT,
    rep_code || '_' || week_number,
    rep_code || '_' || week_number || '_' || day_name,
    day_name,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'A'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'B'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE cls = 'C'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%SUPERMARKET%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%RETAIL%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%HYPERMARKET%'
    )::INTEGER,
    COUNT(*) FILTER (
        WHERE UPPER(stype) LIKE '%MINIMARKET%'
    )::INTEGER,
    COUNT(DISTINCT dst)::INTEGER,
    SUM(visits)::INTEGER
FROM client_base
GROUP BY rep_code,
    week_number,
    day_name;
END IF;
END;
$$;
-- Grant permissions
GRANT EXECUTE ON FUNCTION get_hierarchical_report(text, text, text, text []) TO authenticated,
    service_role,
    anon;