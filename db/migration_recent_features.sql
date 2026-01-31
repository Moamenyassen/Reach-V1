-- 1. Add User Preferences (JSONB)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'app_users'
        AND column_name = 'preferences'
) THEN
ALTER TABLE app_users
ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
END IF;
END $$;
-- 2. Add Partner Program Registration Flag (BOOLEAN)
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS is_registered_customer BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN public.app_users.is_registered_customer IS 'Flag indicating if the internal company user has registered as a Reach Partner';
-- 3. Add User Scopes - Route IDs (TEXT[])
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS route_ids TEXT [] DEFAULT NULL;
COMMENT ON COLUMN public.app_users.route_ids IS 'Array of Route Names assigned to this user for scope restriction';