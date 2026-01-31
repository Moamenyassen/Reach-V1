-- Migration to update RPC functions to use the newly created dedicated columns instead of JSONB extraction.
-- 1. Update get_company_branches to use the dedicated 'branch' column
CREATE OR REPLACE FUNCTION get_company_branches(p_company_id TEXT, p_regions TEXT []) RETURNS TABLE (branch_name TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT DISTINCT branch
FROM customers
WHERE company_id::text = p_company_id
    AND branch IS NOT NULL
    AND TRIM(branch) <> ''
    AND (
        p_regions IS NULL
        OR array_length(p_regions, 1) IS NULL
        OR region_code = ANY(p_regions)
    )
ORDER BY 1;
END;
$$;
-- 2. Update get_company_routes to use the dedicated 'branch' column in its filter
CREATE OR REPLACE FUNCTION get_company_routes(p_company_id TEXT, p_branches TEXT []) RETURNS TABLE (route_name TEXT, user_code TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT DISTINCT c.route_name,
    c.user_code
FROM customers c
WHERE c.company_id::text = p_company_id
    AND (
        c.route_name IS NOT NULL
        OR c.user_code IS NOT NULL
    )
    AND (
        p_branches IS NULL
        OR array_length(p_branches, 1) IS NULL
        OR c.branch = ANY(p_branches)
    )
ORDER BY 1;
END;
$$;