-- ==========================================
-- HIGH-FIDELITY NORMALIZED ARCHITECTURE
-- Migration Script for 4 Relational Tables
-- ==========================================
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ==========================================
-- 1. BRANCHES TABLE (Lookup Table)
-- Purpose: Stores unique branch list (e.g., Jeddah, Riyadh)
-- ==========================================
CREATE TABLE IF NOT EXISTS company_branches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_ar TEXT,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for company_branches
CREATE INDEX IF NOT EXISTS idx_company_branches_code ON company_branches(code);
CREATE INDEX IF NOT EXISTS idx_company_branches_company ON company_branches(company_id);
-- ==========================================
-- 2. ROUTES TABLE (Operational Headers)
-- Purpose: Defines "Who works where". Links route to branch and rep.
-- ==========================================
CREATE TABLE IF NOT EXISTS routes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    rep_code TEXT,
    -- User_Code from CSV
    branch_id UUID REFERENCES company_branches(id) ON DELETE CASCADE,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Unique constraint: route name must be unique within a branch
    UNIQUE(name, branch_id)
);
-- Indexes for routes
CREATE INDEX IF NOT EXISTS idx_routes_branch ON routes(branch_id);
CREATE INDEX IF NOT EXISTS idx_routes_company ON routes(company_id);
CREATE INDEX IF NOT EXISTS idx_routes_rep ON routes(rep_code);
CREATE INDEX IF NOT EXISTS idx_routes_name ON routes(name);
-- ==========================================
-- 3. NORMALIZED CUSTOMERS TABLE (Map Points)
-- Purpose: Stores unique customer records linked to branches
-- ==========================================
CREATE TABLE IF NOT EXISTS normalized_customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_code TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    address TEXT,
    phone TEXT,
    classification TEXT,
    branch_id UUID REFERENCES company_branches(id) ON DELETE CASCADE,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    -- Additional metadata
    vat TEXT,
    buyer_id TEXT,
    store_type TEXT,
    district TEXT,
    dynamic_data JSONB DEFAULT '{}'::JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Constraint: client_code must be unique within a branch
    UNIQUE(client_code, branch_id)
);
-- Indexes for normalized_customers
CREATE INDEX IF NOT EXISTS idx_normalized_customers_client_code ON normalized_customers(client_code);
CREATE INDEX IF NOT EXISTS idx_normalized_customers_branch ON normalized_customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_normalized_customers_company ON normalized_customers(company_id);
CREATE INDEX IF NOT EXISTS idx_normalized_customers_coords ON normalized_customers(lat, lng);
-- ==========================================
-- 4. ROUTE_VISITS TABLE (Schedule Details)
-- Purpose: Links a customer to a specific route/time
-- ==========================================
CREATE TABLE IF NOT EXISTS route_visits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES normalized_customers(id) ON DELETE CASCADE,
    week_number TEXT,
    -- Week identifier (e.g., 'W1', 'W2', or '1', '2')
    day_name TEXT,
    -- Day of visit (e.g., 'Sunday', 'Monday')
    visit_order INTEGER,
    -- Order of visit within the day
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    -- Additional visit metadata
    visit_type TEXT DEFAULT 'SCHEDULED',
    estimated_duration_min INTEGER DEFAULT 15,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent duplicate visits for same customer on same route/week/day
    UNIQUE(route_id, customer_id, week_number, day_name)
);
-- Indexes for route_visits
CREATE INDEX IF NOT EXISTS idx_route_visits_route ON route_visits(route_id);
CREATE INDEX IF NOT EXISTS idx_route_visits_customer ON route_visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_route_visits_company ON route_visits(company_id);
CREATE INDEX IF NOT EXISTS idx_route_visits_schedule ON route_visits(week_number, day_name);
-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- Enable RLS on all normalized tables
ALTER TABLE company_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE normalized_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_visits ENABLE ROW LEVEL SECURITY;
-- Branches RLS Policies
DROP POLICY IF EXISTS "company_branches_company_policy" ON company_branches;
CREATE POLICY "company_branches_company_policy" ON company_branches FOR ALL USING (
    company_id = current_setting('app.company_id', true)::TEXT
    OR current_setting('app.is_sysadmin', true)::BOOLEAN = true
);
-- Allow public access for initial setup and SysAdmin operations
DROP POLICY IF EXISTS "company_branches_public_access" ON company_branches;
CREATE POLICY "company_branches_public_access" ON company_branches FOR ALL USING (true) WITH CHECK (true);
-- Routes RLS Policies
DROP POLICY IF EXISTS "routes_company_policy" ON routes;
CREATE POLICY "routes_company_policy" ON routes FOR ALL USING (
    company_id = current_setting('app.company_id', true)::TEXT
    OR current_setting('app.is_sysadmin', true)::BOOLEAN = true
);
DROP POLICY IF EXISTS "routes_public_access" ON routes;
CREATE POLICY "routes_public_access" ON routes FOR ALL USING (true) WITH CHECK (true);
-- Normalized Customers RLS Policies
DROP POLICY IF EXISTS "normalized_customers_company_policy" ON normalized_customers;
CREATE POLICY "normalized_customers_company_policy" ON normalized_customers FOR ALL USING (
    company_id = current_setting('app.company_id', true)::TEXT
    OR current_setting('app.is_sysadmin', true)::BOOLEAN = true
);
DROP POLICY IF EXISTS "normalized_customers_public_access" ON normalized_customers;
CREATE POLICY "normalized_customers_public_access" ON normalized_customers FOR ALL USING (true) WITH CHECK (true);
-- Route Visits RLS Policies
DROP POLICY IF EXISTS "route_visits_company_policy" ON route_visits;
CREATE POLICY "route_visits_company_policy" ON route_visits FOR ALL USING (
    company_id = current_setting('app.company_id', true)::TEXT
    OR current_setting('app.is_sysadmin', true)::BOOLEAN = true
);
DROP POLICY IF EXISTS "route_visits_public_access" ON route_visits;
CREATE POLICY "route_visits_public_access" ON route_visits FOR ALL USING (true) WITH CHECK (true);
-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================
-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Apply update triggers to all tables
DROP TRIGGER IF EXISTS update_company_branches_updated_at ON company_branches;
CREATE TRIGGER update_company_branches_updated_at BEFORE
UPDATE ON company_branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
CREATE TRIGGER update_routes_updated_at BEFORE
UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_normalized_customers_updated_at ON normalized_customers;
CREATE TRIGGER update_normalized_customers_updated_at BEFORE
UPDATE ON normalized_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_route_visits_updated_at ON route_visits;
CREATE TRIGGER update_route_visits_updated_at BEFORE
UPDATE ON route_visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ==========================================
-- VIEWS FOR EASY QUERYING
-- ==========================================
-- Full route schedule view with all relationships
CREATE OR REPLACE VIEW v_route_schedule AS
SELECT rv.id AS visit_id,
    rv.week_number,
    rv.day_name,
    rv.visit_order,
    rv.visit_type,
    rv.estimated_duration_min,
    r.id AS route_id,
    r.name AS route_name,
    r.rep_code,
    c.id AS customer_id,
    c.client_code,
    c.name_en AS customer_name_en,
    c.name_ar AS customer_name_ar,
    c.lat,
    c.lng,
    c.address,
    c.phone,
    c.classification,
    b.id AS branch_id,
    b.code AS branch_code,
    b.name_en AS branch_name,
    rv.company_id
FROM route_visits rv
    JOIN routes r ON rv.route_id = r.id
    JOIN normalized_customers c ON rv.customer_id = c.id
    JOIN company_branches b ON r.branch_id = b.id;
-- Customer summary view with visit counts
CREATE OR REPLACE VIEW v_customer_summary AS
SELECT c.id,
    c.client_code,
    c.name_en,
    c.name_ar,
    c.lat,
    c.lng,
    c.address,
    c.phone,
    c.classification,
    b.name_en AS branch_name,
    c.company_id,
    COUNT(rv.id) AS total_visits,
    STRING_AGG(DISTINCT r.name, ', ') AS assigned_routes
FROM normalized_customers c
    JOIN company_branches b ON c.branch_id = b.id
    LEFT JOIN route_visits rv ON rv.customer_id = c.id
    LEFT JOIN routes r ON rv.route_id = r.id
GROUP BY c.id,
    c.client_code,
    c.name_en,
    c.name_ar,
    c.lat,
    c.lng,
    c.address,
    c.phone,
    c.classification,
    b.name_en,
    c.company_id;
-- Route summary view with customer counts
CREATE OR REPLACE VIEW v_route_summary AS
SELECT r.id,
    r.name AS route_name,
    r.rep_code,
    b.name_en AS branch_name,
    r.company_id,
    COUNT(DISTINCT rv.customer_id) AS customer_count,
    COUNT(rv.id) AS total_visits,
    STRING_AGG(
        DISTINCT rv.day_name,
        ', '
        ORDER BY rv.day_name
    ) AS active_days
FROM routes r
    JOIN company_branches b ON r.branch_id = b.id
    LEFT JOIN route_visits rv ON rv.route_id = r.id
GROUP BY r.id,
    r.name,
    r.rep_code,
    b.name_en,
    r.company_id;
-- ==========================================
-- SAMPLE DATA VALIDATION QUERIES
-- ==========================================
-- Run these after migration to verify data integrity:
-- Check branches are properly created
-- SELECT * FROM company_branches ORDER BY code;
-- Check routes with branch names
-- SELECT r.*, b.name_en as branch_name FROM routes r JOIN company_branches b ON r.branch_id = b.id;
-- Check customers per branch
-- SELECT c.client_code, c.name_en, b.name_en as branch FROM normalized_customers c JOIN company_branches b ON c.branch_id = b.id;
-- Check full schedule view
-- SELECT * FROM v_route_schedule ORDER BY branch_name, route_name, week_number, day_name, visit_order LIMIT 100;