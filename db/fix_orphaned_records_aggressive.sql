-- NUCLEAR OPTION: Cleanup orphaned records
-- This script safely removes references to non-existent branches
BEGIN;
-- 1. Routes: Set branch_id to NULL for any route pointing to a missing branch
UPDATE routes
SET branch_id = NULL
WHERE branch_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM company_branches
        WHERE id = routes.branch_id
    );
-- 2. Normalized Customers: Set branch_id to NULL for any customer pointing to a missing branch
UPDATE normalized_customers
SET branch_id = NULL
WHERE branch_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM company_branches
        WHERE id = normalized_customers.branch_id
    );
-- 3. Now try to re-apply the constraints
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_branch_id_fkey;
ALTER TABLE routes
ADD CONSTRAINT routes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES company_branches(id) ON DELETE CASCADE;
ALTER TABLE normalized_customers DROP CONSTRAINT IF EXISTS normalized_customers_branch_id_fkey;
ALTER TABLE normalized_customers
ADD CONSTRAINT normalized_customers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES company_branches(id) ON DELETE CASCADE;
COMMIT;
-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst,
'reload config';