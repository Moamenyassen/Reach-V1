-- Rename table
ALTER TABLE IF EXISTS branches
    RENAME TO company_branches;
-- Update Foreign Key Constraints (and likely Index names for clarity, though not strictly required for functionality)
-- 1. Routes
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_branch_id_fkey;
ALTER TABLE routes
ADD CONSTRAINT routes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES company_branches(id) ON DELETE CASCADE;
-- 2. Normalized Customers
ALTER TABLE normalized_customers DROP CONSTRAINT IF EXISTS normalized_customers_branch_id_fkey;
ALTER TABLE normalized_customers
ADD CONSTRAINT normalized_customers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES company_branches(id) ON DELETE CASCADE;
-- 3. Update Indexes (Optional but good practice)
-- Postgres usually handles index renaming if they were auto-named, but manual ones stay.
ALTER INDEX IF EXISTS idx_branches_code
RENAME TO idx_company_branches_code;
ALTER INDEX IF EXISTS idx_branches_company
RENAME TO idx_company_branches_company;
-- 4. Update Policies (RLS)
-- Drop old policies on 'branches' (now 'company_branches')
DROP POLICY IF EXISTS "branches_company_policy" ON company_branches;
DROP POLICY IF EXISTS "branches_public_access" ON company_branches;
-- Create new policies
CREATE POLICY "company_branches_company_policy" ON company_branches FOR ALL USING (
    company_id = current_setting('app.company_id', true)::TEXT
    OR current_setting('app.is_sysadmin', true)::BOOLEAN = true
);
CREATE POLICY "company_branches_public_access" ON company_branches FOR ALL USING (true) WITH CHECK (true);
-- 5. Update Views
-- Views might break if they reference 'branches'. We need to recreate them.
DROP VIEW IF EXISTS v_route_schedule;
DROP VIEW IF EXISTS v_customer_summary;
DROP VIEW IF EXISTS v_route_summary;
-- Recreate v_route_schedule
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
-- Recreate v_customer_summary
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
-- Recreate v_route_summary
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