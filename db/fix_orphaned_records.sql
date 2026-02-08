-- 1. Detach Foreign Key Constraints First (if they exist in a broken state)
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_branch_id_fkey;
ALTER TABLE normalized_customers DROP CONSTRAINT IF EXISTS normalized_customers_branch_id_fkey;
-- 2. Clean up Orphaned Records (Set branch_id to NULL instead of deleting)
-- Routes
UPDATE routes
SET branch_id = NULL
WHERE branch_id IS NOT NULL
    AND branch_id NOT IN (
        SELECT id
        FROM company_branches
    );
-- Normalized Customers
UPDATE normalized_customers
SET branch_id = NULL
WHERE branch_id IS NOT NULL
    AND branch_id NOT IN (
        SELECT id
        FROM company_branches
    );
-- 3. Re-Add Foreign Key Constraints
ALTER TABLE routes
ADD CONSTRAINT routes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES company_branches(id) ON DELETE CASCADE;
ALTER TABLE normalized_customers
ADD CONSTRAINT normalized_customers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES company_branches(id) ON DELETE CASCADE;
-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst,
'reload config';