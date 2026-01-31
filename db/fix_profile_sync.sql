-- 1. Update the handle_new_user() function to sync names, phone, and email from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN -- Check if user already exists (from migration) by email
    IF EXISTS (
        SELECT 1
        FROM app_users
        WHERE username = NEW.email
    ) THEN -- Link existing user and update profile data from metadata
UPDATE app_users
SET auth_user_id = NEW.id,
    email = COALESCE(email, NEW.email),
    first_name = COALESCE(first_name, NEW.raw_user_meta_data->>'firstName'),
    last_name = COALESCE(last_name, NEW.raw_user_meta_data->>'lastName'),
    phone = COALESCE(phone, NEW.raw_user_meta_data->>'phone')
WHERE username = NEW.email;
ELSE -- Create new user profile with all data
INSERT INTO app_users (
        id,
        username,
        email,
        first_name,
        last_name,
        phone,
        password,
        auth_user_id,
        role,
        is_active,
        created_at
    )
VALUES (
        gen_random_uuid(),
        NEW.email,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'firstName', 'New'),
        COALESCE(NEW.raw_user_meta_data->>'lastName', 'User'),
        NEW.raw_user_meta_data->>'phone',
        '',
        NEW.id,
        'USER',
        true,
        NOW()
    );
END IF;
RETURN NEW;
END;
$$;
-- 2. Backfill existing users (Optional: Run this if you have the permission or via Supabase Dashboard)
-- This query helps sync manually if the trigger didn't run for some reason
UPDATE public.app_users u
SET first_name = COALESCE(u.first_name, a.raw_user_meta_data->>'firstName'),
    last_name = COALESCE(u.last_name, a.raw_user_meta_data->>'lastName'),
    phone = COALESCE(u.phone, a.raw_user_meta_data->>'phone'),
    email = COALESCE(u.email, a.email)
FROM auth.users a
WHERE u.auth_user_id = a.id
    AND (
        u.first_name IS NULL
        OR u.last_name IS NULL
        OR u.phone IS NULL
        OR u.email IS NULL
    );