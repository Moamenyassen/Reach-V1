-- =================================================================
-- FIX: ADD ON DELETE CASCADE TO USERS & META
-- =================================================================
-- Rationale: Deleting a company fails because 'app_users' and 'route_meta'
-- records prevent deletion of the parent company record.
-- 
-- This script explicitly re-creates foreign keys for these tables
-- with ON DELETE CASCADE support.
-- =================================================================
BEGIN;
-- 1. APP USERS
-- Drop potential existing constraints (names might vary, trying common ones)
DO $$ BEGIN
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_company_id_fkey;
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS users_company_id_fkey;
END $$;
-- Re-add with CASCADE
ALTER TABLE app_users
ADD CONSTRAINT app_users_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
-- 2. ROUTE META
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'route_meta'
) THEN
ALTER TABLE route_meta DROP CONSTRAINT IF EXISTS route_meta_company_id_fkey;
ALTER TABLE route_meta
ADD CONSTRAINT route_meta_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
END IF;
END $$;
COMMIT;
-- Verification
SELECT tc.table_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE kcu.column_name = 'company_id'
    AND tc.table_name IN ('app_users', 'route_meta');