-- =====================================================
-- FIX: Populate missing emails in app_users
-- =====================================================
-- The RLS helper functions use email to find users.
-- Users with NULL email won't be found, so RLS returns nothing.
-- =====================================================
-- Step 1: Check users with NULL email
SELECT id,
    email,
    role,
    branch_ids
FROM app_users
WHERE email IS NULL
    AND company_id = '31fcb45a-c138-4deb-8755-e9378e95325f';
-- Step 2: Check if we can match these users to auth.users by id
SELECT au.id,
    au.email as app_email,
    u.email as auth_email
FROM app_users au
    JOIN auth.users u ON au.id = u.id
WHERE au.email IS NULL
    AND au.company_id = '31fcb45a-c138-4deb-8755-e9378e95325f';
-- Step 3: Update app_users with email from auth.users
UPDATE app_users au
SET email = u.email
FROM auth.users u
WHERE au.id = u.id
    AND au.email IS NULL;
-- Verify the fix
SELECT id,
    email,
    role,
    branch_ids
FROM app_users
WHERE company_id = '31fcb45a-c138-4deb-8755-e9378e95325f'
    AND role NOT IN ('ADMIN', 'MANAGER', 'SYSADMIN');