-- INDEXES
CREATE INDEX IF NOT EXISTS idx_hierarchical_query ON company_uploaded_data(
    region,
    branch_code,
    branch_name,
    route_name,
    rep_code,
    week_number,
    day_name
);
CREATE INDEX IF NOT EXISTS idx_route_summary ON company_uploaded_data(region, branch_code, route_name);
CREATE INDEX IF NOT EXISTS idx_client_code ON company_uploaded_data(client_code);
CREATE INDEX IF NOT EXISTS idx_classification ON company_uploaded_data(classification);
CREATE INDEX IF NOT EXISTS idx_store_type ON company_uploaded_data(store_type);
CREATE INDEX IF NOT EXISTS idx_district ON company_uploaded_data(district);
CREATE INDEX IF NOT EXISTS idx_user_code ON company_uploaded_data(rep_code);
CREATE INDEX IF NOT EXISTS idx_week_day ON company_uploaded_data(week_number, day_name);
CREATE INDEX IF NOT EXISTS idx_coordinates ON company_uploaded_data(lat, lng)
WHERE lat IS NOT NULL
    AND lng IS NOT NULL;
-- ANALYZE TABLE
ANALYZE company_uploaded_data;
-- RPC 1: Hierarchical Data View (Tab 1)
DROP FUNCTION IF EXISTS get_hierarchical_report(text, text, text);
CREATE OR REPLACE FUNCTION get_hierarchical_report(
        p_company_id TEXT DEFAULT NULL,
        p_target_level TEXT DEFAULT 'BRANCH',
        p_parent_id TEXT DEFAULT NULL
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
    ) LANGUAGE plpgsql AS $$ BEGIN -- Optimization: Use a CTE to reduce the working set and avoid redundant DISTINCT counts
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
-- RPC 2: Route Summary Report (Tab 2)
CREATE OR REPLACE FUNCTION get_route_summary_report(p_company_id TEXT DEFAULT NULL) RETURNS TABLE (
        route_name TEXT,
        branch_name TEXT,
        total_clients INTEGER,
        class_a_pct NUMERIC,
        location_coverage_pct NUMERIC,
        weeks_active INTEGER,
        days_active INTEGER,
        sales_reps_count INTEGER,
        total_planned_visits INTEGER
    ) LANGUAGE plpgsql AS $$ BEGIN RETURN QUERY
SELECT c.route_name,
    MAX(c.branch_name) as branch_name,
    COUNT(DISTINCT c.client_code)::INTEGER as total_clients,
    ROUND(
        100.0 * COUNT(
            DISTINCT CASE
                WHEN c.classification = 'A' THEN c.client_code
            END
        ) / NULLIF(COUNT(DISTINCT c.client_code), 0),
        1
    ) as class_a_pct,
    ROUND(
        100.0 * COUNT(
            DISTINCT CASE
                WHEN c.lat IS NOT NULL
                AND c.lng IS NOT NULL THEN c.client_code
            END
        ) / NULLIF(COUNT(DISTINCT c.client_code), 0),
        1
    ) as location_coverage_pct,
    COUNT(DISTINCT c.week_number)::INTEGER as weeks_active,
    COUNT(DISTINCT c.day_name)::INTEGER as days_active,
    COUNT(DISTINCT c.rep_code)::INTEGER as sales_reps_count,
    COUNT(*)::INTEGER as total_planned_visits
FROM company_uploaded_data c
WHERE (
        p_company_id IS NULL
        OR c.company_id = p_company_id
    )
GROUP BY c.route_name
ORDER BY total_clients DESC;
END;
$$;
-- RPC 3: Visit Frequency Analysis (Tab 3)
CREATE OR REPLACE FUNCTION get_visit_frequency_report(
        p_company_id TEXT DEFAULT NULL,
        p_limit INTEGER DEFAULT 100
    ) RETURNS TABLE (
        client_code TEXT,
        client_name_en TEXT,
        client_name_ar TEXT,
        classification TEXT,
        store_type TEXT,
        district TEXT,
        total_visits INTEGER,
        weeks_covered INTEGER,
        days_per_week INTEGER,
        visit_days TEXT,
        routes_assigned INTEGER
    ) LANGUAGE plpgsql AS $$ BEGIN RETURN QUERY
SELECT c.client_code,
    MAX(c.customer_name_en) as client_name_en,
    MAX(c.customer_name_ar) as client_name_ar,
    MAX(c.classification) as classification,
    MAX(c.store_type) as store_type,
    MAX(c.district) as district,
    COUNT(*)::INTEGER as total_visits,
    COUNT(DISTINCT c.week_number)::INTEGER as weeks_covered,
    COUNT(DISTINCT c.day_name)::INTEGER as days_per_week,
    STRING_AGG(DISTINCT c.day_name, ', ')::TEXT as visit_days,
    COUNT(DISTINCT c.route_name)::INTEGER as routes_assigned
FROM company_uploaded_data c
WHERE (
        p_company_id IS NULL
        OR c.company_id = p_company_id
    )
    AND c.client_code IS NOT NULL
GROUP BY c.client_code
ORDER BY total_visits DESC
LIMIT p_limit;
END;
$$;
-- RPC 4: Route Efficiency Dashboard (Tab 4)
CREATE OR REPLACE FUNCTION get_route_efficiency_report(p_company_id TEXT DEFAULT NULL) RETURNS TABLE (
        route_name TEXT,
        branch_name TEXT,
        total_clients INTEGER,
        districts_covered INTEGER,
        users_assigned INTEGER,
        avg_clients_per_day NUMERIC,
        gps_coverage_percent NUMERIC
    ) LANGUAGE plpgsql AS $$ BEGIN RETURN QUERY
SELECT c.route_name,
    MAX(c.branch_name) as branch_name,
    COUNT(DISTINCT c.client_code)::INTEGER as total_clients,
    COUNT(DISTINCT c.district)::INTEGER as districts_covered,
    COUNT(DISTINCT c.rep_code)::INTEGER as users_assigned,
    ROUND(
        CAST(COUNT(DISTINCT c.client_code) AS NUMERIC) / NULLIF(COUNT(DISTINCT c.day_name), 0),
        1
    ) as avg_clients_per_day,
    ROUND(
        100.0 * COUNT(
            DISTINCT CASE
                WHEN c.lat IS NOT NULL THEN c.client_code
            END
        ) / NULLIF(COUNT(DISTINCT c.client_code), 0),
        1
    ) as gps_coverage_percent
FROM company_uploaded_data c
WHERE (
        p_company_id IS NULL
        OR c.company_id = p_company_id
    )
GROUP BY c.route_name
ORDER BY total_clients DESC;
END;
$$;
-- RPC 5: User Workload Balance (Tab 5)
CREATE OR REPLACE FUNCTION get_user_workload_report(p_company_id TEXT DEFAULT NULL) RETURNS TABLE (
        rep_code TEXT,
        total_clients INTEGER,
        total_visits INTEGER,
        weekly_visits NUMERIC,
        avg_clients_per_day NUMERIC,
        a_class_count INTEGER,
        b_class_count INTEGER,
        c_class_count INTEGER,
        districts_covered INTEGER,
        routes_assigned INTEGER
    ) LANGUAGE plpgsql AS $$ BEGIN RETURN QUERY
SELECT c.rep_code,
    COUNT(DISTINCT c.client_code)::INTEGER as total_clients,
    COUNT(*)::INTEGER as total_visits,
    ROUND(CAST(COUNT(*) AS NUMERIC) / 4.0, 1) as weekly_visits,
    ROUND(
        CAST(COUNT(DISTINCT c.client_code) AS NUMERIC) / NULLIF(COUNT(DISTINCT c.day_name), 0),
        1
    ) as avg_clients_per_day,
    COUNT(
        DISTINCT CASE
            WHEN c.classification = 'A' THEN c.client_code
        END
    )::INTEGER as a_class_count,
    COUNT(
        DISTINCT CASE
            WHEN c.classification = 'B' THEN c.client_code
        END
    )::INTEGER as b_class_count,
    COUNT(
        DISTINCT CASE
            WHEN c.classification = 'C' THEN c.client_code
        END
    )::INTEGER as c_class_count,
    COUNT(DISTINCT c.district)::INTEGER as districts_covered,
    COUNT(DISTINCT c.route_name)::INTEGER as routes_assigned
FROM company_uploaded_data c
WHERE (
        p_company_id IS NULL
        OR c.company_id = p_company_id
    )
GROUP BY c.rep_code
ORDER BY total_clients DESC;
END;
$$;
-- RPC 6: Data Quality Scorecard (Tab 6)
CREATE OR REPLACE FUNCTION get_data_quality_report(p_company_id TEXT DEFAULT NULL) RETURNS TABLE (
        route_name TEXT,
        branch_name TEXT,
        total_records INTEGER,
        gps_coverage NUMERIC,
        phone_coverage NUMERIC,
        classification_coverage NUMERIC,
        store_type_coverage NUMERIC,
        schedule_coverage NUMERIC,
        vat_coverage NUMERIC
    ) LANGUAGE plpgsql AS $$ BEGIN RETURN QUERY
SELECT c.route_name,
    MAX(c.branch_name) as branch_name,
    COUNT(*)::INTEGER as total_records,
    ROUND(
        100.0 * COUNT(
            CASE
                WHEN c.lat IS NOT NULL
                AND c.lng IS NOT NULL THEN 1
            END
        ) / COUNT(*),
        1
    ) as gps_coverage,
    ROUND(
        100.0 * COUNT(
            CASE
                WHEN c.phone IS NOT NULL
                AND c.phone != '0' THEN 1
            END
        ) / COUNT(*),
        1
    ) as phone_coverage,
    ROUND(
        100.0 * COUNT(
            CASE
                WHEN c.classification IS NOT NULL THEN 1
            END
        ) / COUNT(*),
        1
    ) as classification_coverage,
    ROUND(
        100.0 * COUNT(
            CASE
                WHEN c.store_type IS NOT NULL THEN 1
            END
        ) / COUNT(*),
        1
    ) as store_type_coverage,
    ROUND(
        100.0 * COUNT(
            CASE
                WHEN c.week_number IS NOT NULL
                AND c.day_name IS NOT NULL THEN 1
            END
        ) / COUNT(*),
        1
    ) as schedule_coverage,
    ROUND(
        100.0 * COUNT(
            CASE
                WHEN c.vat IS NOT NULL THEN 1
            END
        ) / COUNT(*),
        1
    ) as vat_coverage
FROM company_uploaded_data c
WHERE (
        p_company_id IS NULL
        OR c.company_id = p_company_id
    )
GROUP BY c.route_name
ORDER BY total_records DESC;
END;
$$;
-- RPC 7: Weekly Coverage Gaps (Tab 7)
CREATE OR REPLACE FUNCTION get_weekly_coverage_report(
        p_company_id TEXT DEFAULT NULL,
        p_limit INTEGER DEFAULT 100
    ) RETURNS TABLE (
        client_code TEXT,
        client_name TEXT,
        classification TEXT,
        store_type TEXT,
        route_name TEXT,
        week_1_covered BOOLEAN,
        week_2_covered BOOLEAN,
        week_3_covered BOOLEAN,
        week_4_covered BOOLEAN,
        weeks_covered INTEGER,
        coverage_percent NUMERIC
    ) LANGUAGE plpgsql AS $$ BEGIN RETURN QUERY
SELECT c.client_code,
    MAX(c.customer_name_en) as client_name,
    MAX(c.classification) as classification,
    MAX(c.store_type) as store_type,
    MAX(c.route_name) as route_name,
    BOOL_OR(
        c.week_number = 'Week One'
        OR c.week_number = 'Week 1'
    ) as week_1_covered,
    BOOL_OR(
        c.week_number = 'Week Tow'
        OR c.week_number = 'Week Two'
        OR c.week_number = 'Week 2'
    ) as week_2_covered,
    BOOL_OR(
        c.week_number = 'Week Three'
        OR c.week_number = 'Week 3'
    ) as week_3_covered,
    BOOL_OR(
        c.week_number = 'Week Four'
        OR c.week_number = 'Week 4'
    ) as week_4_covered,
    COUNT(DISTINCT c.week_number)::INTEGER as weeks_covered,
    ROUND(100.0 * COUNT(DISTINCT c.week_number) / 4.0, 0) as coverage_percent
FROM company_uploaded_data c
WHERE (
        p_company_id IS NULL
        OR c.company_id = p_company_id
    )
    AND c.client_code IS NOT NULL
GROUP BY c.client_code
ORDER BY coverage_percent ASC,
    client_name
LIMIT p_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION get_hierarchical_report TO authenticated,
    service_role,
    anon;
GRANT EXECUTE ON FUNCTION get_route_summary_report TO authenticated,
    service_role,
    anon;
GRANT EXECUTE ON FUNCTION get_visit_frequency_report TO authenticated,
    service_role,
    anon;
GRANT EXECUTE ON FUNCTION get_route_efficiency_report TO authenticated,
    service_role,
    anon;
GRANT EXECUTE ON FUNCTION get_user_workload_report TO authenticated,
    service_role,
    anon;
GRANT EXECUTE ON FUNCTION get_data_quality_report TO authenticated,
    service_role,
    anon;
GRANT EXECUTE ON FUNCTION get_weekly_coverage_report TO authenticated,
    service_role,
    anon;