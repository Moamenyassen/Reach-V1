-- Add route_ids column to app_users table
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS route_ids TEXT [] DEFAULT NULL;
-- Comment on column
COMMENT ON COLUMN public.app_users.route_ids IS 'Array of Route Names assigned to this user for scope restriction';