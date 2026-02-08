-- =====================================================
-- DIAGNOSTIC: Check branch_ids vs actual branch names
-- =====================================================
-- The RLS policy uses: name_en = ANY(get_user_branch_ids())
-- If user's branch_ids doesn't match name_en exactly, they see nothing.
-- =====================================================
-- Step 1: Check what branches exist for the company
SELECT id,
    code,
    name_en,
    name_ar
FROM company_branches
WHERE company_id = '31fcb45a-c138-4deb-8755-e9378e95325f';
-- Step 2: Check a restricted user's branch_ids
-- Replace the email with the actual restricted user's email
SELECT email,
    role,
    branch_ids,
    route_ids
FROM app_users
WHERE role NOT IN ('ADMIN', 'MANAGER', 'SYSADMIN')
    AND company_id = '31fcb45a-c138-4deb-8755-e9378e95325f'
LIMIT 5;
-- Step 3: Check what get_user_branch_ids() returns for current user
-- This will only work when logged in as that user
SELECT get_user_branch_ids();