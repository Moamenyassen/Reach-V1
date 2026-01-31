-- Function to get unique branches directly from customers metadata
CREATE OR REPLACE FUNCTION get_company_branches(p_company_id UUID) RETURNS TABLE (branch_name TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT DISTINCT data->>'branch'
FROM customers
WHERE company_id = p_company_id
    AND data->>'branch' IS NOT NULL
    AND data->>'branch' <> ''
ORDER BY 1;
END;
$$;
-- Function to get unique routes directly from customers metadata, optionally filtered by branch
CREATE OR REPLACE FUNCTION get_company_routes(p_company_id UUID, p_branches TEXT []) RETURNS TABLE (route_name TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT DISTINCT c.route_name
FROM customers c
WHERE c.company_id = p_company_id
    AND c.route_name IS NOT NULL
    AND c.route_name <> ''
    AND (
        p_branches IS NULL
        OR array_length(p_branches, 1) IS NULL
        OR (c.data->>'branch') = ANY(p_branches)
    )
ORDER BY 1;
END;
$$;