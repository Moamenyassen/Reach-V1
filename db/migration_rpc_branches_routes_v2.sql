-- Function to get unique branches directly from customers metadata
CREATE OR REPLACE FUNCTION get_company_branches(p_company_id UUID) RETURNS TABLE (branch_name TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT DISTINCT data->>'branch'
FROM customers
WHERE company_id = p_company_id
    AND data->>'branch' IS NOT NULL
    AND TRIM(data->>'branch') <> ''
ORDER BY 1;
END;
$$;
-- Function to get unique routes directly from customers metadata, optionally filtered by branch
CREATE OR REPLACE FUNCTION get_company_routes(p_company_id UUID, p_branches TEXT []) RETURNS TABLE (route_name TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN -- If no branches provided, return ALL routes for the company
    IF p_branches IS NULL
    OR array_length(p_branches, 1) IS NULL THEN RETURN QUERY
SELECT DISTINCT c.route_name
FROM customers c
WHERE c.company_id = p_company_id
    AND c.route_name IS NOT NULL
    AND TRIM(c.route_name) <> ''
ORDER BY 1;
ELSE -- Filter by selected branches
RETURN QUERY
SELECT DISTINCT c.route_name
FROM customers c
WHERE c.company_id = p_company_id
    AND c.route_name IS NOT NULL
    AND TRIM(c.route_name) <> ''
    AND (c.data->>'branch') = ANY(p_branches)
ORDER BY 1;
END IF;
END;
$$;