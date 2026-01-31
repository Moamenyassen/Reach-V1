-- 1. Sync existing users: Copy username to email column if email is null
UPDATE public.app_users
SET email = username
WHERE email IS NULL
    OR email = '';
-- 2. Enhance handle_new_user function to also populate the email column
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN -- Check if user already exists (from migration) by email
    IF EXISTS (
        SELECT 1
        FROM app_users
        WHERE username = NEW.email
    ) THEN -- Link existing user to auth account and ensure email is set
UPDATE app_users
SET auth_user_id = NEW.id,
    email = COALESCE(email, NEW.email)
WHERE username = NEW.email;
ELSE -- Create new user profile with email column populated
INSERT INTO app_users (
        id,
        username,
        email,
        -- Added this column
        password,
        auth_user_id,
        role,
        is_active,
        created_at,
        first_name,
        last_name
    )
VALUES (
        gen_random_uuid(),
        NEW.email,
        NEW.email,
        -- Population for the new column
        '',
        NEW.id,
        'USER',
        true,
        NOW(),
        COALESCE(NEW.raw_user_meta_data->>'firstName', 'New'),
        COALESCE(NEW.raw_user_meta_data->>'lastName', 'User')
    );
END IF;
RETURN NEW;
END;
$$;