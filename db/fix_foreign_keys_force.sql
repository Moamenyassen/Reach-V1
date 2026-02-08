-- Force recreate foreign keys to ensure PostgREST cache picks them up
-- 1. Routes
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_branch_id_fkey;
ALTER TABLE routes
ADD CONSTRAINT routes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES company_branches(id) ON DELETE CASCADE;
-- 2. Normalized Customers
ALTER TABLE normalized_customers DROP CONSTRAINT IF EXISTS normalized_customers_branch_id_fkey;
ALTER TABLE normalized_customers
ADD CONSTRAINT normalized_customers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES company_branches(id) ON DELETE CASCADE;
-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst,
'reload config';