-- ==========================================
-- REACH AI - SUPABASE AUTH MIGRATION
-- ==========================================
-- Run this migration to enable proper authentication
-- 
-- PREREQUISITES:
-- 1. Backup your app_users table first
-- 2. Enable Email auth in Supabase Dashboard > Authentication > Providers
-- ==========================================
-- Step 1: Add auth_user_id column to link with Supabase Auth
ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE
SET NULL;
-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_users_auth_user_id ON app_users(auth_user_id);
-- Step 3: Create a function to handle new user signups
-- This creates a profile in app_users when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN -- Check if user already exists (from migration) by email
    IF EXISTS (
        SELECT 1
        FROM app_users
        WHERE username = NEW.email
    ) THEN -- Link existing user to auth account
UPDATE app_users
SET auth_user_id = NEW.id
WHERE username = NEW.email;
ELSE -- Create new user profile
INSERT INTO app_users (
        id,
        username,
        password,
        -- Will be empty, auth handled by Supabase
        auth_user_id,
        role,
        is_active,
        created_at
    )
VALUES (
        gen_random_uuid(),
        NEW.email,
        '',
        -- No plaintext password stored
        NEW.id,
        'USER',
        true,
        NOW()
    );
END IF;
RETURN NEW;
END;
$$;
-- Step 4: Create trigger for new signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Step 5: Function to get user's profile including company info
CREATE OR REPLACE FUNCTION public.get_user_profile() RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE user_profile JSON;
BEGIN
SELECT json_build_object(
        'id',
        u.id,
        'username',
        u.username,
        'role',
        u.role,
        'isActive',
        u.is_active,
        'companyId',
        u.company_id,
        'branchIds',
        u.branch_ids,
        'lastLogin',
        u.last_login,
        'firstName',
        u.first_name,
        'lastName',
        u.last_name,
        'email',
        u.email,
        'phone',
        u.phone
    ) INTO user_profile
FROM app_users u
WHERE u.auth_user_id = auth.uid();
RETURN user_profile;
END;
$$;
-- Step 6: Function to link existing users during migration
-- Run this manually for each user you want to migrate
CREATE OR REPLACE FUNCTION public.migrate_user_to_auth(
        p_username TEXT,
        p_temp_password TEXT DEFAULT 'ChangeMe123!'
    ) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_email TEXT;
v_auth_id UUID;
BEGIN -- Get user's email or username as email
SELECT COALESCE(email, username) INTO v_email
FROM app_users
WHERE username = p_username;
IF v_email IS NULL THEN RETURN 'User not found';
END IF;
-- Note: This function returns the email for manual auth creation
-- Supabase doesn't allow creating auth users via SQL directly
-- Use the Admin API or Dashboard to create the auth user
RETURN 'Please create auth user for: ' || v_email || ' via Supabase Dashboard or Admin API';
END;
$$;
-- Step 7: Update last_login function to work with auth
CREATE OR REPLACE FUNCTION public.update_last_login() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
UPDATE app_users
SET last_login = NOW()
WHERE auth_user_id = NEW.id;
RETURN NEW;
END;
$$;
-- Optional: Trigger on auth.users to update last_login
-- Note: Supabase fires "sign_in" events differently, this is for the users table
DROP TRIGGER IF EXISTS on_auth_user_signin ON auth.users;
-- Step 8: Add columns for enhanced profile if not exists
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'app_users'
        AND column_name = 'first_name'
) THEN
ALTER TABLE app_users
ADD COLUMN first_name TEXT;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'app_users'
        AND column_name = 'last_name'
) THEN
ALTER TABLE app_users
ADD COLUMN last_name TEXT;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'app_users'
        AND column_name = 'email'
) THEN
ALTER TABLE app_users
ADD COLUMN email TEXT;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'app_users'
        AND column_name = 'phone'
) THEN
ALTER TABLE app_users
ADD COLUMN phone TEXT;
END IF;
END $$;
-- ==========================================
-- MIGRATION NOTES:
-- ==========================================
-- 
-- After running this migration:
-- 
-- 1. For each existing user, create an auth account in Supabase Dashboard:
--    - Go to Authentication > Users > Add User
--    - Use their email (or username@yourcompany.com)
--    - Set a temporary password
--    - The trigger will automatically link them
--
-- 2. Update your frontend to use:
--    - supabase.auth.signInWithPassword()
--    - supabase.auth.signUp()
--    - supabase.auth.signOut()
--
-- 3. Remove plaintext passwords from app_users table:
--    UPDATE app_users SET password = '' WHERE auth_user_id IS NOT NULL;
--
-- ==========================================