-- Function to get unique branches directly from customers metadata
-- CHANGED: p_company_id is now TEXT to support legacy/license-based IDs
CREATE OR REPLACE FUNCTION get_company_branches(p_company_id TEXT) RETURNS TABLE (branch_name TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT DISTINCT data->>'branch'
FROM customers
WHERE company_id::text = p_company_id
    AND data->>'branch' IS NOT NULL
    AND TRIM(data->>'branch') <> ''
ORDER BY 1;
END;
$$;
-- Function to get unique routes (AND USER CODES) directly from customers metadata
-- CHANGED: p_company_id is now TEXT to support legacy/license-based IDs
CREATE OR REPLACE FUNCTION get_company_routes(p_company_id TEXT, p_branches TEXT []) RETURNS TABLE (route_name TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN -- If no branches provided
    IF p_branches IS NULL
    OR array_length(p_branches, 1) IS NULL THEN RETURN QUERY -- Combine route_name AND user_code
SELECT DISTINCT route_val
FROM (
        SELECT c.route_name as route_val
        FROM customers c
        WHERE c.company_id::text = p_company_id
            AND c.route_name IS NOT NULL
            AND TRIM(c.route_name) <> ''
        UNION
        SELECT c.user_code as route_val
        FROM customers c
        WHERE c.company_id::text = p_company_id
            AND c.user_code IS NOT NULL
            AND TRIM(c.user_code) <> ''
    ) as combined
ORDER BY 1;
ELSE -- Filter by selected branches
RETURN QUERY
SELECT DISTINCT route_val
FROM (
        SELECT c.route_name as route_val
        FROM customers c
        WHERE c.company_id::text = p_company_id
            AND c.route_name IS NOT NULL
            AND TRIM(c.route_name) <> ''
            AND (c.data->>'branch') = ANY(p_branches)
        UNION
        SELECT c.user_code as route_val
        FROM customers c
        WHERE c.company_id::text = p_company_id
            AND c.user_code IS NOT NULL
            AND TRIM(c.user_code) <> ''
            AND (c.data->>'branch') = ANY(p_branches)
    ) as combined
ORDER BY 1;
END IF;
END;
$$;