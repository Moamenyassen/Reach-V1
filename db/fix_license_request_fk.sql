-- =================================================================
-- FIX: License Request Foreign Key to Support Legacy Users
-- -----------------------------------------------------------------
-- The current constraint likely points to auth.users(id).
-- Legacy users do not have an auth.users entry, so this fails.
-- We change the Foreign Key to point to public.app_users(id),
-- which covers ALL users (both legacy and authenticated).
-- =================================================================
-- 1. Drop the existing constraint (to auth.users)
ALTER TABLE public.reach_license_requests DROP CONSTRAINT IF EXISTS reach_license_requests_linked_user_id_fkey;
-- 2. Add the correct constraint (to app_users)
-- This ensures that any user ID passed from the app (app_users.id) is valid.
ALTER TABLE public.reach_license_requests
ADD CONSTRAINT reach_license_requests_linked_user_id_fkey FOREIGN KEY (linked_user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
-- Optional: Delete request if user is deleted
-- 3. Verification
SELECT conname AS constraint_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conrelid = 'public.reach_license_requests'::regclass
    AND conname = 'reach_license_requests_linked_user_id_fkey';