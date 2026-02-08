-- =============================================
-- FULL REGISTRATION FIX MIGRATION
-- 1. Creates app_users
-- 2. Syncs to reach_customers (CRM)
-- =============================================
-- A. ENSURE COLUMNS EXIST (Safe idempotent checks)
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS is_registered_customer BOOLEAN DEFAULT FALSE;
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS last_name TEXT;
-- B. Ensure reach_customers table exists (Basic Schema fallback)
CREATE TABLE IF NOT EXISTS public.reach_customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    country TEXT,
    role TEXT,
    status TEXT DEFAULT 'lead',
    linked_user_id UUID REFERENCES public.app_users(id) ON DELETE
    SET NULL,
        referred_by_partner_id TEXT
);
-- C. RECREATE TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE new_app_user_id UUID;
v_first_name TEXT;
v_last_name TEXT;
v_phone TEXT;
BEGIN -- Extract metadata once
v_first_name := COALESCE(NEW.raw_user_meta_data->>'firstName', 'New');
v_last_name := COALESCE(NEW.raw_user_meta_data->>'lastName', 'User');
v_phone := NEW.raw_user_meta_data->>'phone';
-- 1. UPSERT into app_users
IF EXISTS (
    SELECT 1
    FROM public.app_users
    WHERE username = NEW.email
) THEN -- Link existing user
UPDATE public.app_users
SET auth_user_id = NEW.id,
    email = COALESCE(email, NEW.email),
    first_name = COALESCE(first_name, v_first_name),
    last_name = COALESCE(last_name, v_last_name),
    phone = COALESCE(phone, v_phone)
WHERE username = NEW.email
RETURNING id INTO new_app_user_id;
ELSE -- Create new user
INSERT INTO public.app_users (
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
        is_registered_customer,
        created_at
    )
VALUES (
        gen_random_uuid(),
        NEW.email,
        NEW.email,
        v_first_name,
        v_last_name,
        v_phone,
        '',
        NEW.id,
        'USER',
        true,
        false,
        NOW()
    )
RETURNING id INTO new_app_user_id;
END IF;
-- 2. INSERT into reach_customers (CRM Sync)
-- Only insert if it doesn't exist to prevent duplicates
IF NOT EXISTS (
    SELECT 1
    FROM public.reach_customers
    WHERE email = NEW.email
) THEN
INSERT INTO public.reach_customers (
        first_name,
        last_name,
        email,
        phone,
        status,
        linked_user_id,
        country
    )
VALUES (
        v_first_name,
        v_last_name,
        NEW.email,
        v_phone,
        'lead',
        new_app_user_id,
        NEW.raw_user_meta_data->>'country'
    );
ELSE -- Optional: update existing lead with new linked_user_id
UPDATE public.reach_customers
SET linked_user_id = new_app_user_id
WHERE email = NEW.email;
END IF;
RETURN NEW;
END;
$$;
-- D. REATTACH TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- E. PERMISSIONS
GRANT ALL ON public.app_users TO postgres,
    service_role,
    anon,
    authenticated;
GRANT ALL ON public.reach_customers TO postgres,
    service_role,
    anon,
    authenticated;