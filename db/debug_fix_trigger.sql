-- =============================================
-- DIAGNOSTIC & FIX MIGRATION
-- Run this to fix missing columns and REVEAL the specific error
-- =============================================
-- 1. Ensure ALL potential missing columns exist (Safe to run multiple times)
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
-- 2. Drop existing trigger/function to ensure clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
-- 3. Re-create the function WITHOUT silent error swallowing
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN -- Check if user already exists
    IF EXISTS (
        SELECT 1
        FROM public.app_users
        WHERE username = NEW.email
    ) THEN
UPDATE public.app_users
SET auth_user_id = NEW.id,
    email = COALESCE(email, NEW.email),
    first_name = COALESCE(first_name, NEW.raw_user_meta_data->>'firstName'),
    last_name = COALESCE(last_name, NEW.raw_user_meta_data->>'lastName'),
    phone = COALESCE(phone, NEW.raw_user_meta_data->>'phone')
WHERE username = NEW.email;
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
        COALESCE(NEW.raw_user_meta_data->>'firstName', 'New'),
        COALESCE(NEW.raw_user_meta_data->>'lastName', 'User'),
        NEW.raw_user_meta_data->>'phone',
        '',
        -- Empty password (auth managed by Supabase)
        NEW.id,
        'USER',
        true,
        false,
        NOW()
    );
END IF;
RETURN NEW;
END;
$$;
-- 4. Re-attach trigger
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- 5. Grant permissions (Crucial for RLS/Security Definers)
GRANT ALL ON public.app_users TO postgres;
GRANT ALL ON public.app_users TO service_role;
GRANT ALL ON public.app_users TO anon;
GRANT ALL ON public.app_users TO authenticated;