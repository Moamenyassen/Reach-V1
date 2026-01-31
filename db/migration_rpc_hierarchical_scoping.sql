-- 1. Function to get unique regions
CREATE OR REPLACE FUNCTION get_company_regions(p_company_id TEXT) RETURNS TABLE (region_code TEXT, region_description TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT DISTINCT COALESCE(c.region_code, 'N/A'),
    COALESCE(c.region_description, 'Unknown Region')
FROM customers c
WHERE c.company_id::text = p_company_id
    AND c.region_code IS NOT NULL
ORDER BY 1;
END;
$$;
-- 2. Function to get unique branches, optionally filtered by region
CREATE OR REPLACE FUNCTION get_company_branches(p_company_id TEXT, p_regions TEXT []) RETURNS TABLE (branch_name TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT DISTINCT data->>'branch'
FROM customers
WHERE company_id::text = p_company_id
    AND data->>'branch' IS NOT NULL
    AND TRIM(data->>'branch') <> ''
    AND (
        p_regions IS NULL
        OR array_length(p_regions, 1) IS NULL
        OR region_code = ANY(p_regions)
    )
ORDER BY 1;
END;
$$;
-- 3. Function to get unique routes WITH user_code
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
        OR (c.data->>'branch') = ANY(p_branches)
    )
ORDER BY 1;
END;
$$;