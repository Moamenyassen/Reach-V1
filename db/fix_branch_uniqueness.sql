-- Fix Branch Uniqueness Constraint
-- Currently 'code' is globally unique, which prevents other companies from using the same branch code.
-- We need to scope it to company_id.
-- 1. Drop the global unique constraint
ALTER TABLE company_branches DROP CONSTRAINT IF EXISTS company_branches_code_key;
-- 2. Add composite unique constraint (code + company_id)
-- Using a custom name to be safe
ALTER TABLE company_branches
ADD CONSTRAINT company_branches_code_company_key UNIQUE (code, company_id);
-- 3. Update the indexes if needed (Composite index is good for lookups too)
DROP INDEX IF EXISTS idx_company_branches_code;
CREATE INDEX idx_company_branches_code_company ON company_branches(code, company_id);