-- Function to fetch unique values with counts for filters
-- Useful for showing "Branch A (50)", "Route B (12)"
CREATE OR REPLACE FUNCTION fetch_unique_upload_data_with_counts(
    p_company_id TEXT,
    p_column_name TEXT,
    p_filter_col TEXT DEFAULT NULL,
    p_filter_val TEXT DEFAULT NULL
  ) RETURNS TABLE (val TEXT, count BIGINT) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN -- 1. If filtering by another column (e.g. Filter Routes by Branch Name)
  IF p_filter_col IS NOT NULL
  AND p_filter_val IS NOT NULL
  AND p_filter_val != 'All'
  AND p_filter_val != '' THEN RETURN QUERY EXECUTE format(
    'SELECT DISTINCT %I::TEXT as val, COUNT(*)::BIGINT as count
             FROM company_uploaded_data 
             WHERE UPPER(TRIM(company_id)) = UPPER(TRIM(%L)) 
               AND %I = %L 
               AND %I IS NOT NULL 
               AND TRIM(%I::TEXT) <> ''''
             GROUP BY %I
             ORDER BY 1',
    p_column_name,
    p_company_id,
    p_filter_col,
    p_filter_val,
    p_column_name,
    p_column_name,
    p_column_name
  );
-- 2. No extra filter (Standard distinct list)
ELSE RETURN QUERY EXECUTE format(
  'SELECT DISTINCT %I::TEXT as val, COUNT(*)::BIGINT as count
             FROM company_uploaded_data 
             WHERE UPPER(TRIM(company_id)) = UPPER(TRIM(%L)) 
               AND %I IS NOT NULL 
               AND TRIM(%I::TEXT) <> ''''
             GROUP BY %I
             ORDER BY 1',
  p_column_name,
  p_company_id,
  p_column_name,
  p_column_name,
  p_column_name
);
END IF;
END;
$$;
-- Grant permissions
GRANT EXECUTE ON FUNCTION fetch_unique_upload_data_with_counts(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fetch_unique_upload_data_with_counts(TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION fetch_unique_upload_data_with_counts(TEXT, TEXT, TEXT, TEXT) TO anon;
-- Function to get distinct customer count for a route
CREATE OR REPLACE FUNCTION get_route_distinct_customer_count(
    p_company_id TEXT,
    p_route_name TEXT,
    p_branch_name TEXT DEFAULT NULL
  ) RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count BIGINT;
BEGIN IF p_branch_name IS NOT NULL
AND p_branch_name != 'All'
AND p_branch_name != '' THEN
SELECT COUNT(DISTINCT client_code)::BIGINT INTO v_count
FROM company_uploaded_data
WHERE UPPER(TRIM(company_id)) = UPPER(TRIM(p_company_id))
  AND route_name = p_route_name
  AND branch_name = p_branch_name;
ELSE
SELECT COUNT(DISTINCT client_code)::BIGINT INTO v_count
FROM company_uploaded_data
WHERE UPPER(TRIM(company_id)) = UPPER(TRIM(p_company_id))
  AND route_name = p_route_name;
END IF;
RETURN v_count;
END;
$$;
-- Grant permissions for the new function
GRANT EXECUTE ON FUNCTION get_route_distinct_customer_count(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_route_distinct_customer_count(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_route_distinct_customer_count(TEXT, TEXT, TEXT) TO anon;
-- Force schema reload
NOTIFY pgrst,
'reload schema';